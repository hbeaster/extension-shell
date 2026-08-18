using Microsoft.AspNetCore.Mvc;
using Shell.Api.ExtensionCatalog;

namespace Shell.Api.Controllers;

/// <summary>
/// Extension discovery. The shell calls this once at startup to learn what is
/// installed and how to mount it; the bundles and icons themselves are plain
/// static assets under <c>/extensions/</c>.
/// </summary>
[ApiController]
[Route("api/extensions")]
public class ExtensionsController : ControllerBase
{
    private readonly IExtensionCatalog _catalog;

    public ExtensionsController(IExtensionCatalog catalog)
    {
        _catalog = catalog;
    }

    [HttpGet]
    public ExtensionsResponse Get()
    {
        // The catalog rescans on every call so a remounted volume needs no
        // restart; a cached response would put that right back.
        Response.Headers.CacheControl = "no-store";
        return new ExtensionsResponse(_catalog.Scan());
    }
}
