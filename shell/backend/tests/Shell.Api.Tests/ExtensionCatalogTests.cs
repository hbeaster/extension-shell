using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Shell.Api.ExtensionCatalog;

namespace Shell.Api.Tests;

public class ExtensionCatalogTests : IDisposable
{
    private readonly ExtensionsDirectory _extensions = new();

    public void Dispose()
    {
        _extensions.Dispose();
        GC.SuppressFinalize(this);
    }

    private static FileSystemExtensionCatalog CatalogFor(string? rootPath) =>
        new(
            Options.Create(new ExtensionsOptions { RootPath = rootPath }),
            new TestWebHostEnvironment(),
            NullLogger<FileSystemExtensionCatalog>.Instance);

    private FileSystemExtensionCatalog Catalog() => CatalogFor(_extensions.Root);

    [Fact]
    public void Scan_WithNoRootConfigured_ReturnsEmpty()
    {
        // No override and no wwwroot on disk: the plain shell image's normal state.
        Assert.Empty(CatalogFor(null).Scan());
    }

    [Fact]
    public void Scan_WithMissingRootDirectory_ReturnsEmpty()
    {
        Assert.Empty(CatalogFor(Path.Combine(_extensions.Root, "not-here")).Scan());
    }

    [Fact]
    public void Scan_WithEmptyRootDirectory_ReturnsEmpty()
    {
        Assert.Empty(Catalog().Scan());
    }

    [Fact]
    public void Scan_MapsEveryDescriptorField()
    {
        _extensions.WriteExtension("buzzer", ExtensionsDirectory.WebComponentManifest, name: "ext-buzzer", version: "2.3.4");

        var extension = Assert.Single(Catalog().Scan());

        Assert.Equal("buzzer", extension.Id);
        Assert.Equal("ext-buzzer", extension.Name);
        Assert.Equal("Buzzer", extension.DisplayName);
        Assert.Equal("2.3.4", extension.Version);
        Assert.Equal("WebComponent", extension.Type);
        Assert.Equal("ext-buzzer", extension.Tag);
        Assert.Equal("/extensions/buzzer/extension.js", extension.Module);
        Assert.Equal("/extensions/buzzer/icon.svg", extension.Icon);
        Assert.Null(extension.Discovery);
        Assert.Null(extension.Services);
    }

    [Fact]
    public void Scan_DefaultsModuleAndIcon_WhenTheManifestOmitsThem()
    {
        _extensions.WriteExtension("smiley-face", """
            { "type": "WebComponent", "displayName": "Smiley Face", "tag": "ext-smiley-face" }
            """);

        var extension = Assert.Single(Catalog().Scan());

        Assert.Equal("/extensions/smiley-face/extension.js", extension.Module);
        Assert.Equal("/extensions/smiley-face/icon.svg", extension.Icon);
    }

    [Fact]
    public void Scan_FallsBackToPackageName_WhenDisplayNameIsAbsent()
    {
        _extensions.WriteExtension("buzzer", """
            { "type": "WebComponent", "tag": "ext-buzzer" }
            """, name: "ext-buzzer");

        Assert.Equal("ext-buzzer", Assert.Single(Catalog().Scan()).DisplayName);
    }

    [Fact]
    public void Scan_SkipsMalformedPackageJson_AndKeepsTheRest()
    {
        // The resilience case: a half-written volume must still serve whatever
        // is intact rather than blanking the sidebar.
        _extensions.WritePackageJson("broken", "{ \"bc-extension\": { \"type\":");
        _extensions.WriteExtension("buzzer", ExtensionsDirectory.WebComponentManifest);

        Assert.Equal("buzzer", Assert.Single(Catalog().Scan()).Id);
    }

    [Fact]
    public void Scan_SkipsFolderWithoutPackageJson()
    {
        _extensions.WriteFile("stray", "extension.js", "export default {}\n");

        Assert.Empty(Catalog().Scan());
    }

    [Fact]
    public void Scan_SkipsPackageJsonWithoutBcExtensionSection()
    {
        _extensions.WritePackageJson("plain", """{ "name": "plain", "version": "1.0.0" }""");

        Assert.Empty(Catalog().Scan());
    }

    [Fact]
    public void Scan_OmitsTypeTheShellCannotHost()
    {
        _extensions.WriteExtension("viewer", """
            { "type": "iFrame", "displayName": "Viewer", "tag": "ext-viewer" }
            """);

        Assert.Empty(Catalog().Scan());
    }

    [Theory]
    [InlineData("""{ "type": "WebComponent", "tag": "buzzer" }""")]
    [InlineData("""{ "type": "WebComponent", "tag": "" }""")]
    [InlineData("""{ "type": "WebComponent" }""")]
    public void Scan_SkipsExtensionWithoutAnExtPrefixedTag(string manifest)
    {
        _extensions.WriteExtension("buzzer", manifest);

        Assert.Empty(Catalog().Scan());
    }

    [Theory]
    [InlineData("../../elsewhere.js")]
    [InlineData("nested/extension.js")]
    [InlineData("..")]
    public void Scan_SkipsModulePointingOutsideTheExtensionFolder(string module)
    {
        _extensions.WriteExtension("buzzer", $$"""
            { "type": "WebComponent", "tag": "ext-buzzer", "module": "{{module}}" }
            """);

        Assert.Empty(Catalog().Scan());
    }

    [Fact]
    public void Scan_SkipsExtensionWhoseBundleIsMissing()
    {
        // Listing it would put a permanently broken entry in the sidebar.
        _extensions.WriteExtension("buzzer", ExtensionsDirectory.WebComponentManifest, withModule: false);

        Assert.Empty(Catalog().Scan());
    }

    [Fact]
    public void Scan_ListsExtensionWhoseIconIsMissing()
    {
        // A missing icon is cosmetic, so it must not cost the extension its entry.
        _extensions.WriteExtension("buzzer", ExtensionsDirectory.WebComponentManifest, withIcon: false);

        Assert.Equal("buzzer", Assert.Single(Catalog().Scan()).Id);
    }

    [Fact]
    public void Scan_OrdersById()
    {
        _extensions.WriteExtension("smiley-face", """
            { "type": "WebComponent", "tag": "ext-smiley-face" }
            """);
        _extensions.WriteExtension("buzzer", """
            { "type": "WebComponent", "tag": "ext-buzzer" }
            """);
        _extensions.WriteExtension("alpha", """
            { "type": "WebComponent", "tag": "ext-alpha" }
            """);

        Assert.Equal(["alpha", "buzzer", "smiley-face"], Catalog().Scan().Select(extension => extension.Id));
    }

    [Fact]
    public void Scan_CarriesDiscoveryAndServicesVerbatim()
    {
        _extensions.WriteExtension("buzzer", """
            {
              "type": "WebComponent",
              "tag": "ext-buzzer",
              "discovery": {
                "implements": [ { "name": "extensions-standard", "versions": [ "1.1.1" ] } ],
                "requires": [ { "name": "DesignSystemStandard", "versions": [ "1.1.1", "2.0.0" ] } ]
              },
              "services": {
                "Standards-DocumentViewerService": { "optional": false, "versions": [ "2.0.0", "3.0.0" ] }
              }
            }
            """);

        var extension = Assert.Single(Catalog().Scan());

        Assert.NotNull(extension.Discovery);
        var discovery = extension.Discovery;
        var implemented = Assert.Single(discovery.Implements);
        Assert.Equal("extensions-standard", implemented.Name);
        Assert.Equal(["1.1.1"], implemented.Versions);
        var required = Assert.Single(discovery.Requires);
        Assert.Equal("DesignSystemStandard", required.Name);
        Assert.Equal(["1.1.1", "2.0.0"], required.Versions);

        Assert.NotNull(extension.Services);
        // The key is an author-chosen service name, not a JSON property name:
        // its hyphens and casing are part of the value.
        var service = Assert.Single(extension.Services);
        Assert.Equal("Standards-DocumentViewerService", service.Key);
        Assert.False(service.Value.Optional);
        Assert.Equal(["2.0.0", "3.0.0"], service.Value.Versions);
    }

    [Fact]
    public void Scan_MapsAnEmptyDiscoverySectionToEmptyLists()
    {
        _extensions.WriteExtension("buzzer", """
            { "type": "WebComponent", "tag": "ext-buzzer", "discovery": {} }
            """);

        var discovery = Assert.Single(Catalog().Scan()).Discovery;
        Assert.NotNull(discovery);
        Assert.Empty(discovery.Implements);
        Assert.Empty(discovery.Requires);
    }

    [Fact]
    public void Scan_ReflectsAnExtensionAddedBetweenCalls()
    {
        // The whole point of scanning per request: a volume remounted under a
        // running pod shows up without a restart.
        var catalog = Catalog();
        Assert.Empty(catalog.Scan());

        _extensions.WriteExtension("buzzer", ExtensionsDirectory.WebComponentManifest);

        Assert.Single(catalog.Scan());
    }

    private sealed class TestWebHostEnvironment : IWebHostEnvironment
    {
        // Deliberately null, as it is whenever wwwroot does not exist.
        public string WebRootPath { get; set; } = null!;
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public string EnvironmentName { get; set; } = "Production";
        public string ApplicationName { get; set; } = "Shell.Api.Tests";
    }
}
