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

app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/healthz");

// SPA fallback: client-side routes resolve to the Vue app's entry point.
app.MapFallbackToFile("index.html");

app.Run();

public partial class Program;
