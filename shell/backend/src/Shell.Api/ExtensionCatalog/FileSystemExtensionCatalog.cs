using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;

namespace Shell.Api.ExtensionCatalog;

public interface IExtensionCatalog
{
    IReadOnlyList<ExtensionDescriptor> Scan();
}

/// <summary>
/// Discovers extensions by reading the extensions directory. The folder
/// contents are the configuration: one subfolder per extension, each holding a
/// <c>package.json</c> with a <c>bc-extension</c> section, its bundle, and its
/// icon (ADR 0012).
/// </summary>
/// <remarks>
/// Scans on every call, deliberately. A mounted volume can be replaced under a
/// running pod, and a developer rebuilds the dist while the backend stays up;
/// both show up on the next page load rather than the next restart. Two files
/// per extension at a handful of extensions is not worth a cache that would
/// have to be invalidated correctly.
/// </remarks>
public sealed partial class FileSystemExtensionCatalog : IExtensionCatalog
{
    // The shell hosts custom elements today. "iFrame" is the expected next type;
    // until it exists, an extension declaring one is omitted, not broken.
    private const string SupportedType = "WebComponent";
    private const string DefaultModule = "extension.js";
    private const string DefaultIcon = "icon.svg";

    private static readonly JsonSerializerOptions ManifestJson = new(JsonSerializerDefaults.Web)
    {
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    private readonly ExtensionsOptions _options;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<FileSystemExtensionCatalog> _logger;

    public FileSystemExtensionCatalog(
        IOptions<ExtensionsOptions> options,
        IWebHostEnvironment environment,
        ILogger<FileSystemExtensionCatalog> logger)
    {
        ArgumentNullException.ThrowIfNull(options);
        _options = options.Value;
        _environment = environment;
        _logger = logger;
    }

    // The id is a URL segment (/extensions/<id>/) and a route segment (/ext/<id>).
    [GeneratedRegex("^[a-z0-9][a-z0-9._-]*$")]
    private static partial Regex IdPattern { get; }

    public IReadOnlyList<ExtensionDescriptor> Scan()
    {
        var root = ExtensionsRoot.Resolve(_options, _environment);
        if (!Directory.Exists(root))
        {
            // Not a warning: the plain shell image ships with no extensions.
            LogRootMissing(root);
            return [];
        }

        string[] directories;
        try
        {
            directories = Directory.GetDirectories(root);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            LogRootUnreadable(ex, root);
            return [];
        }

        var descriptors = new List<ExtensionDescriptor>(directories.Length);
        foreach (var directory in directories)
        {
            var descriptor = ReadExtension(directory);
            if (descriptor is not null)
            {
                descriptors.Add(descriptor);
            }
        }

        descriptors.Sort((left, right) => string.CompareOrdinal(left.Id, right.Id));
        return descriptors;
    }

    /// <summary>
    /// Reads one candidate folder, or returns null if it is not a usable
    /// extension. One bad folder must never take down discovery for the rest —
    /// a half-populated volume degrades to the extensions that are intact.
    /// </summary>
    private ExtensionDescriptor? ReadExtension(string directory)
    {
        var id = Path.GetFileName(directory);
        if (!IdPattern.IsMatch(id))
        {
            LogUnusableId(id);
            return null;
        }

        var packagePath = Path.Combine(directory, "package.json");
        if (!File.Exists(packagePath))
        {
            LogNoPackageJson(id);
            return null;
        }

        PackageJsonManifest? package;
        try
        {
            package = JsonSerializer.Deserialize<PackageJsonManifest>(File.ReadAllText(packagePath), ManifestJson);
        }
        catch (Exception ex) when (ex is JsonException or IOException or UnauthorizedAccessException)
        {
            LogUnreadablePackageJson(ex, id, packagePath);
            return null;
        }

        var manifest = package?.BcExtension;
        if (manifest is null)
        {
            LogNoManifestSection(id);
            return null;
        }

        if (!string.Equals(manifest.Type, SupportedType, StringComparison.OrdinalIgnoreCase))
        {
            LogUnsupportedType(id, manifest.Type);
            return null;
        }

        var tag = manifest.Tag;
        if (string.IsNullOrEmpty(tag) || !tag.StartsWith("ext-", StringComparison.Ordinal))
        {
            LogUnusableTag(id, tag);
            return null;
        }

        var module = manifest.Module ?? DefaultModule;
        var icon = manifest.Icon ?? DefaultIcon;
        if (!IsPlainFileName(module) || !IsPlainFileName(icon))
        {
            LogNonLocalAsset(id, module, icon);
            return null;
        }

        // A listed extension whose bundle 404s is a dead sidebar entry, so a
        // missing module disqualifies it. A missing icon is only cosmetic.
        if (!File.Exists(Path.Combine(directory, module)))
        {
            LogMissingBundle(id, module);
            return null;
        }
        if (!File.Exists(Path.Combine(directory, icon)))
        {
            LogMissingIcon(id, icon);
        }

        var name = string.IsNullOrWhiteSpace(package?.Name) ? id : package.Name;
        return new ExtensionDescriptor(
            Id: id,
            Name: name,
            DisplayName: string.IsNullOrWhiteSpace(manifest.DisplayName) ? name : manifest.DisplayName,
            Version: string.IsNullOrWhiteSpace(package?.Version) ? "0.0.0" : package.Version,
            Type: SupportedType,
            Tag: tag,
            Module: AssetUrl(id, module),
            Icon: AssetUrl(id, icon),
            Discovery: MapDiscovery(manifest.Discovery),
            Services: MapServices(manifest.Services));
    }

    // Guards against a manifest aiming the shell's dynamic import somewhere
    // other than the extension's own folder, e.g. "../../elsewhere.js".
    private static bool IsPlainFileName(string value) =>
        value.Length > 0
        && value is not ("." or "..")
        && Path.GetFileName(value) == value
        && value.AsSpan().IndexOfAny('/', '\\', ':') < 0;

    private static string AssetUrl(string id, string file) =>
        $"/extensions/{Uri.EscapeDataString(id)}/{Uri.EscapeDataString(file)}";

    private static ExtensionDiscovery? MapDiscovery(DiscoverySection? discovery) =>
        discovery is null
            ? null
            : new ExtensionDiscovery(MapCapabilities(discovery.Implements), MapCapabilities(discovery.Requires));

    private static ExtensionCapabilityRef[] MapCapabilities(List<CapabilityRefSection>? capabilities) =>
        capabilities is null
            ? []
            : [.. capabilities
                .Where(capability => !string.IsNullOrWhiteSpace(capability.Name))
                .Select(capability => new ExtensionCapabilityRef(capability.Name!, capability.Versions ?? []))];

    // Service names are author-chosen identifiers such as
    // "Standards-DocumentViewerService" and travel to the client untouched.
    private static Dictionary<string, ExtensionServiceRequirement>? MapServices(
        Dictionary<string, ServiceRequirementSection>? services) =>
        services?.ToDictionary(
            service => service.Key,
            service => new ExtensionServiceRequirement(
                service.Value.Optional,
                service.Value.Versions ?? []),
            StringComparer.Ordinal);

    [LoggerMessage(Level = LogLevel.Debug, Message = "Extensions directory {Root} does not exist; no extensions are installed")]
    private partial void LogRootMissing(string root);

    [LoggerMessage(Level = LogLevel.Error, Message = "Could not enumerate extensions directory {Root}")]
    private partial void LogRootUnreadable(Exception exception, string root);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Ignoring extension folder {Id}: the folder name is not a usable URL segment")]
    private partial void LogUnusableId(string id);

    [LoggerMessage(Level = LogLevel.Debug, Message = "Ignoring {Id}: no package.json")]
    private partial void LogNoPackageJson(string id);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Skipping {Id}: could not read {PackagePath}")]
    private partial void LogUnreadablePackageJson(Exception exception, string id, string packagePath);

    [LoggerMessage(Level = LogLevel.Debug, Message = "Ignoring {Id}: package.json has no bc-extension section")]
    private partial void LogNoManifestSection(string id);

    [LoggerMessage(Level = LogLevel.Information, Message = "Omitting {Id}: bc-extension.type {Type} is not a type this shell can host")]
    private partial void LogUnsupportedType(string id, string? type);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Skipping {Id}: bc-extension.tag {Tag} must start with \"ext-\"")]
    private partial void LogUnusableTag(string id, string? tag);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Skipping {Id}: bc-extension.module {Module} and .icon {Icon} must be plain file names inside the extension folder")]
    private partial void LogNonLocalAsset(string id, string module, string icon);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Skipping {Id}: bundle {Module} is missing from the extension folder")]
    private partial void LogMissingBundle(string id, string module);

    [LoggerMessage(Level = LogLevel.Warning, Message = "{Id}: icon {Icon} is missing; the sidebar entry will render without one")]
    private partial void LogMissingIcon(string id, string icon);
}
