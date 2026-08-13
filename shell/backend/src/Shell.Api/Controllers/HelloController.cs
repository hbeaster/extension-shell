using Microsoft.AspNetCore.Mvc;

namespace Shell.Api.Controllers;

[ApiController]
[Route("api/hello")]
public class HelloController : ControllerBase
{
    [HttpGet]
    public HelloResponse Get() => new("Hello from Shell.Api", DateTime.UtcNow);
}

public record HelloResponse(string Message, DateTime ServerTimeUtc);
