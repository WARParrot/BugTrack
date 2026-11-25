using BugTrack.Data;
using BugTrack.Infrastructure;
using Microsoft.AspNetCore.DataProtection;
using AuthService = BugTrack.Services.Interfaces.IAuthenticationService;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;
var production = builder.Environment.IsProduction();

// Same startup rule as the original: production must bootstrap an administrator.
if (production && (string.IsNullOrWhiteSpace(config["Admin:Email"]) || string.IsNullOrWhiteSpace(config["Admin:Password"])))
    throw new InvalidOperationException("Admin:Email и Admin:Password обязательны в production");

builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 64 * 1024);

builder.Services.AddDataAccess(config);
builder.Services.AddBugTrackServices();
builder.Services.AddApiControllers();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

// The session cookie is encrypted with Data Protection keys; persist them so sessions survive restarts.
builder.Services.AddDataProtection()
    .SetApplicationName("BugTrack")
    .PersistKeysToFileSystem(new DirectoryInfo(config["DataProtection:KeysPath"] ?? ".data/keys"));
builder.Services.AddCookieSession(production);

// For a browser frontend served from another origin (e.g. a dev server). Cookies need AllowCredentials.
var allowedOrigins = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
if (allowedOrigins.Length > 0)
    builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
    await scope.ServiceProvider.GetRequiredService<IDatabaseInitializer>().InitializeAsync();

    var adminEmail = config["Admin:Email"];
    var adminPassword = config["Admin:Password"];
    if (!string.IsNullOrWhiteSpace(adminEmail) && !string.IsNullOrWhiteSpace(adminPassword))
        await scope.ServiceProvider.GetRequiredService<AuthService>()
            .EnsureAdminAsync(config["Admin:Name"] ?? "Администратор", adminEmail, adminPassword);
}

app.UseExceptionHandler(_ => { });
if (allowedOrigins.Length > 0) app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

public partial class Program;
