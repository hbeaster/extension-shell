using Extensions.Api.Controllers;

namespace Extensions.Api.Tests;

public class HelloControllerTests
{
    [Fact]
    public void Get_ReturnsGreetingWithUtcTimestamp()
    {
        var controller = new HelloController();

        var response = controller.Get();

        Assert.Equal("Hello from Extensions.Api", response.Message);
        Assert.Equal(DateTimeKind.Utc, response.ServerTimeUtc.Kind);
    }
}
