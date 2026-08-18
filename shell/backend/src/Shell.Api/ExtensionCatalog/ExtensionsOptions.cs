namespace Shell.Api.ExtensionCatalog;

/// <summary>
/// Binds the <c>Extensions</c> configuration section.
/// </summary>
public sealed class ExtensionsOptions
{
    public const string SectionName = "Extensions";

    /// <summary>
    /// Development-only override pointing at the extensions workspace dist.
    /// Absolute, or relative to the content root. When unset, extensions are
    /// read from <c>wwwroot/extensions</c>, where the container image puts them.
    /// </summary>
    public string? RootPath { get; set; }
}
