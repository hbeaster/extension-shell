using System.Globalization;

namespace Shell.Api.Tests;

/// <summary>
/// A throwaway extensions root on disk. Extension discovery reads real
/// directories and real package.json text, so the tests write real ones rather
/// than mocking a file provider.
/// </summary>
internal sealed class ExtensionsDirectory : IDisposable
{
    public string Root { get; } = Path.Combine(
        Path.GetTempPath(),
        "shell-ext-tests",
        Guid.NewGuid().ToString("n", CultureInfo.InvariantCulture));

    public ExtensionsDirectory() => Directory.CreateDirectory(Root);

    /// <summary>
    /// Writes a well-formed extension folder: package.json wrapping the given
    /// <c>bc-extension</c> object literal, plus the bundle and icon files.
    /// </summary>
    public void WriteExtension(
        string id,
        string bcExtension,
        string? name = null,
        string version = "1.0.0",
        bool withModule = true,
        bool withIcon = true,
        string moduleFile = "extension.js",
        string iconFile = "icon.svg")
    {
        var nameField = name is null ? string.Empty : $"\"name\": \"{name}\",\n  ";
        WritePackageJson(id, $$"""
            {
              {{nameField}}"version": "{{version}}",
              "bc-extension": {{bcExtension}}
            }
            """);

        if (withModule)
        {
            WriteFile(id, moduleFile, "export default {}\n");
        }
        if (withIcon)
        {
            WriteFile(id, iconFile, "<svg xmlns=\"http://www.w3.org/2000/svg\" />\n");
        }
    }

    /// <summary>The manifest every "does it map correctly" test starts from.</summary>
    public const string WebComponentManifest = """
        {
          "type": "WebComponent",
          "displayName": "Buzzer",
          "tag": "ext-buzzer",
          "module": "extension.js",
          "icon": "icon.svg"
        }
        """;

    public void WritePackageJson(string id, string contents)
    {
        Directory.CreateDirectory(Path.Combine(Root, id));
        WriteFile(id, "package.json", contents);
    }

    public void WriteFile(string id, string fileName, string contents)
    {
        var directory = Path.Combine(Root, id);
        Directory.CreateDirectory(directory);
        File.WriteAllText(Path.Combine(directory, fileName), contents);
    }

    public void Dispose()
    {
        try
        {
            Directory.Delete(Root, recursive: true);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            // A leftover temp directory is not worth failing a test run over.
        }
    }
}
