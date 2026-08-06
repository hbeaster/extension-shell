using Microsoft.AspNetCore.Mvc;

namespace Extensions.Api.Controllers;

[ApiController]
[Route("api/hello")]
public class HelloController : ControllerBase
{
    [HttpGet]
    public HelloResponse Get() => new("Hello from Extensions.Api", DateTime.UtcNow);
}

public record HelloResponse(string Message, DateTime ServerTimeUtc);
