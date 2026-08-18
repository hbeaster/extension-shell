using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Shell.Api.ExtensionCatalog;

namespace Shell.Api.Tests;

public class ExtensionsEndpointTests : IDisposable
{
    private readonly ExtensionsDirectory _extensions = new();
    private readonly ExtensionsFactory _factory;

    public ExtensionsEndpointTests()
    {
        _factory = new ExtensionsFactory(_extensions.Root);
    }

    public void Dispose()
    {
        _factory.Dispose();
        _extensions.Dispose();
        GC.SuppressFinalize(this);
    }

    /// <summary>
    /// Pins the environment as well as the root. appsettings.Development.json
    /// points Extensions:RootPath at the real extensions/dist, and the test host
    /// otherwise inherits ASPNETCORE_ENVIRONMENT from whoever runs it.
    /// </summary>
    private sealed class ExtensionsFactory : WebApplicationFactory<Program>
    {
        private readonly string? _root;

        public ExtensionsFactory(string? root) => _root = root;

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Production");
            builder.UseSetting("Extensions:RootPath", _root ?? string.Empty);
        }
    }

    [Fact]
    public async Task GetExtensions_ReturnsTheInstalledExtensions()
    {
        _extensions.WriteExtension("buzzer", ExtensionsDirectory.WebComponentManifest, name: "ext-buzzer");
        using var client = _factory.CreateClient();

        var response = await client.GetAsync(new Uri("/api/extensions", UriKind.Relative));

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<ExtensionsResponse>();
        Assert.NotNull(body);
        var extension = Assert.Single(body.Extensions);
        Assert.Equal("buzzer", extension.Id);
        Assert.Equal("Buzzer", extension.DisplayName);
        Assert.Equal("/extensions/buzzer/extension.js", extension.Module);
    }

    [Fact]
    public async Task GetExtensions_WithNoRootConfigured_ReturnsAnEmptyListRatherThanAnError()
    {
        using var factory = new ExtensionsFactory(root: null);
        using var client = factory.CreateClient();

        var response = await client.GetAsync(new Uri("/api/extensions", UriKind.Relative));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("{\"extensions\":[]}", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task GetExtensions_SerializesCamelCaseFieldsAndVerbatimServiceKeys()
    {
        _extensions.WriteExtension("buzzer", """
            {
              "type": "WebComponent",
              "displayName": "Buzzer",
              "tag": "ext-buzzer",
              "services": {
                "Standards-DocumentViewerService": { "optional": false, "versions": [ "2.0.0" ] }
              }
            }
            """);
        using var client = _factory.CreateClient();

        var payload = await client.GetStringAsync(new Uri("/api/extensions", UriKind.Relative));

        using var document = JsonDocument.Parse(payload);
        var extension = document.RootElement.GetProperty("extensions")[0];
        Assert.True(extension.TryGetProperty("displayName", out _));
        Assert.False(extension.TryGetProperty("DisplayName", out _));
        // The manifest key is an implementation detail of the file on disk; the
        // wire format is a flat descriptor.
        Assert.False(extension.TryGetProperty("bc-extension", out _));
        // Service names are values, so no naming policy may rewrite them.
        Assert.True(extension.GetProperty("services").TryGetProperty("Standards-DocumentViewerService", out _));
    }

    [Fact]
    public async Task GetExtensions_IsNotCacheable()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync(new Uri("/api/extensions", UriKind.Relative));

        Assert.True(response.Headers.CacheControl?.NoStore);
    }

    [Fact]
    public async Task GetExtensions_WithOneMalformedFolder_StillReturnsTheHealthyOnes()
    {
        _extensions.WritePackageJson("broken", "{ \"bc-extension\": { \"type\":");
        _extensions.WriteExtension("buzzer", ExtensionsDirectory.WebComponentManifest);
        using var client = _factory.CreateClient();

        var response = await client.GetAsync(new Uri("/api/extensions", UriKind.Relative));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ExtensionsResponse>();
        Assert.NotNull(body);
        Assert.Equal("buzzer", Assert.Single(body.Extensions).Id);
    }

    [Fact]
    public async Task ExtensionAssets_AreServedFromTheSameRootTheEndpointScans()
    {
        _extensions.WriteExtension("buzzer", ExtensionsDirectory.WebComponentManifest);
        using var client = _factory.CreateClient();

        var descriptors = await client.GetFromJsonAsync<ExtensionsResponse>(
            new Uri("/api/extensions", UriKind.Relative));
        Assert.NotNull(descriptors);
        var module = Assert.Single(descriptors.Extensions).Module;

        var response = await client.GetAsync(new Uri(module, UriKind.Relative));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("export default {}\n", await response.Content.ReadAsStringAsync());
    }
}
