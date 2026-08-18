namespace Shell.Api.ExtensionCatalog;

/// <summary>
/// Resolves the one directory that holds installed extensions. Both the
/// discovery scan and the static-file middleware go through here, so a request
/// to <c>/api/extensions</c> and a request for <c>/extensions/&lt;id&gt;/extension.js</c>
/// can never disagree about where extensions live.
/// </summary>
internal static class ExtensionsRoot
{
    /// <summary>
    /// Returns an absolute path, which may not exist — an absent directory is a
    /// normal state (the plain shell image ships with zero extensions).
    /// </summary>
    public static string Resolve(ExtensionsOptions options, IWebHostEnvironment environment)
    {
        if (!string.IsNullOrWhiteSpace(options.RootPath))
        {
            return Path.GetFullPath(options.RootPath, environment.ContentRootPath);
        }

        // WebRootPath is null whenever wwwroot is absent, which is the case for
        // `dotnet run` against the backend alone and for every test host.
        var webRoot = string.IsNullOrEmpty(environment.WebRootPath)
            ? Path.Combine(environment.ContentRootPath, "wwwroot")
            : environment.WebRootPath;

        return Path.Combine(webRoot, "extensions");
    }
}
