namespace Shell.Api.ExtensionCatalog;

/// <summary>Body of <c>GET /api/extensions</c>.</summary>
public sealed record ExtensionsResponse(IReadOnlyList<ExtensionDescriptor> Extensions);

/// <summary>
/// One installed extension, as the shell needs to mount it. Assembled from the
/// extension's own <c>package.json</c>: <see cref="Id"/> is the folder name,
/// <see cref="Name"/> and <see cref="Version"/> are the package's top-level
/// fields, and the rest comes from its <c>bc-extension</c> section.
/// </summary>
/// <param name="Module">Absolute URL, <c>/extensions/&lt;id&gt;/&lt;file&gt;</c>.</param>
/// <param name="Icon">Absolute URL, <c>/extensions/&lt;id&gt;/&lt;file&gt;</c>.</param>
/// <param name="Discovery">
/// Declared standards, carried verbatim. The shell does not check them: an
/// extension is mounted whether or not its requirements are satisfiable.
/// </param>
/// <param name="Services">
/// Declared data-service requirements, keyed by service name and likewise
/// carried, not enforced.
/// </param>
public sealed record ExtensionDescriptor(
    string Id,
    string Name,
    string DisplayName,
    string Version,
    string Type,
    string Tag,
    string Module,
    string Icon,
    ExtensionDiscovery? Discovery,
    IReadOnlyDictionary<string, ExtensionServiceRequirement>? Services);

public sealed record ExtensionDiscovery(
    IReadOnlyList<ExtensionCapabilityRef> Implements,
    IReadOnlyList<ExtensionCapabilityRef> Requires);

public sealed record ExtensionCapabilityRef(string Name, IReadOnlyList<string> Versions);

public sealed record ExtensionServiceRequirement(bool Optional, IReadOnlyList<string> Versions);
