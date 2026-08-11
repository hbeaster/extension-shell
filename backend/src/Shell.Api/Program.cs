using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddHealthChecks();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// TLS terminates at the ingress; the container listens on plain HTTP,
// so no UseHttpsRedirection here.
app.UseDefaultFiles();
app.UseStaticFiles();

// Extensions live in wwwroot/extensions in the container image. For local dev
// (no wwwroot), Extensions:RootPath points at the extensions workspace dist.
var extensionsRoot = app.Configuration["Extensions:RootPath"];
if (!string.IsNullOrWhiteSpace(extensionsRoot))
{
    var fullPath = Path.GetFullPath(extensionsRoot, app.Environment.ContentRootPath);
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
