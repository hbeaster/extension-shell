using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Shell.Api.Controllers;

namespace Shell.Api.Tests;

public class ApiIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public ApiIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetHello_ReturnsOkWithMessage()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync(new Uri("/api/hello", UriKind.Relative));

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<HelloResponse>();
        Assert.NotNull(body);
        Assert.Equal("Hello from Shell.Api", body.Message);
    }

    [Fact]
    public async Task Healthz_ReturnsHealthy()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync(new Uri("/healthz", UriKind.Relative));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync());
    }
}
