using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using Shell.Api.ExtensionCatalog;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddHealthChecks();
builder.Services.Configure<ExtensionsOptions>(builder.Configuration.GetSection(ExtensionsOptions.SectionName));
builder.Services.AddSingleton<IExtensionCatalog, FileSystemExtensionCatalog>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// TLS terminates at the ingress; the container listens on plain HTTP,
// so no UseHttpsRedirection here.
app.UseDefaultFiles();
app.UseStaticFiles();

// Extensions live in wwwroot/extensions in the container image, which
// UseStaticFiles above already serves. For local dev (no wwwroot),
// Extensions:RootPath points at the extensions workspace dist and needs its own
// provider. The branch is gated on the override rather than on the resolved
// root so production does not end up serving wwwroot/extensions twice.
var extensionsOptions = app.Services.GetRequiredService<IOptions<ExtensionsOptions>>().Value;
if (!string.IsNullOrWhiteSpace(extensionsOptions.RootPath))
{
    // Same resolution the discovery endpoint uses, so /api/extensions and
    // /extensions/<id>/extension.js can never disagree about the directory.
    var fullPath = ExtensionsRoot.Resolve(extensionsOptions, app.Environment);
    if (Directory.Exists(fullPath))
    {
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(fullPath),
            RequestPath = "/extensions",
        });
    }
}

app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/healthz");

// SPA fallback: client-side routes resolve to the Vue app's entry point.
app.MapFallbackToFile("index.html");

app.Run();

public partial class Program;
