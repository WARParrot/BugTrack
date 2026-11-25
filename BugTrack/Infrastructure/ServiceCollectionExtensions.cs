using BugTrack.DTO.Responses;
using BugTrack.Services;
using BugTrack.Services.Interfaces;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using AuthService = BugTrack.Services.Interfaces.IAuthenticationService;

namespace BugTrack.Infrastructure;

public static class ServiceCollectionExtensions
{
    public const string CookieName = "bugtrack_session";

    public static IServiceCollection AddBugTrackServices(this IServiceCollection services)
    {
        services.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();
        services.AddScoped<AuthService, BugTrack.Services.AuthenticationService>();
        services.AddScoped<IProjectService, ProjectService>();
        services.AddScoped<ITicketService, TicketService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IReleaseService, ReleaseService>();
        return services;
    }

    /// <summary>MVC, JSON and the uniform <c>{ "error": ... }</c> shape for binding/validation failures.</summary>
    public static IServiceCollection AddApiControllers(this IServiceCollection services)
    {
        services
            .AddControllers(options =>
            {
                var messages = options.ModelBindingMessageProvider;
                messages.SetAttemptedValueIsInvalidAccessor((value, field) => $"Некорректное значение поля {field}");
                messages.SetValueIsInvalidAccessor(value => "Некорректное значение");
                messages.SetValueMustNotBeNullAccessor(value => "Значение обязательно");
                messages.SetMissingRequestBodyRequiredValueAccessor(() => "Требуется тело запроса");
            })
            .AddJsonOptions(options =>
            {
                // Enums travel as their names (PROJECT_MANAGER, READY_FOR_REVIEW, ...), never as numbers.
                options.JsonSerializerOptions.Converters.Add(
                    new System.Text.Json.Serialization.JsonStringEnumConverter(allowIntegerValues: false));
                options.JsonSerializerOptions.MaxDepth = 1024; // reply chains can be deep
            })
            .ConfigureApiBehaviorOptions(options =>
            {
                options.InvalidModelStateResponseFactory = context =>
                {
                    // Name the first offending field ("Некорректное поле: name") rather than echoing
                    // framework-generated English text, so all error messages stay consistent.
                    var field = context.ModelState
                        .Where(entry => entry.Value is { Errors.Count: > 0 })
                        .Select(entry => entry.Key.TrimStart('$', '.'))
                        .FirstOrDefault(key => key.Length > 0);
                    var message = field is null ? "Некорректные данные" : $"Некорректное поле: {ToCamelCase(field)}";
                    return new BadRequestObjectResult(new ErrorResponse(message));
                };
            });
        return services;
    }

    /// <summary>
    /// Cookie-based session: encrypted + signed auth cookie (ASP.NET Core Data Protection),
    /// HttpOnly, SameSite=Strict, 8 hours. Unauthenticated calls get 401/403 JSON instead of redirects.
    /// </summary>
    public static IServiceCollection AddCookieSession(this IServiceCollection services, bool production)
    {
        services
            .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
            .AddCookie(options =>
            {
                options.Cookie.Name = CookieName;
                options.Cookie.HttpOnly = true;
                options.Cookie.SameSite = SameSiteMode.Strict;
                options.Cookie.SecurePolicy = production ? CookieSecurePolicy.Always : CookieSecurePolicy.SameAsRequest;
                options.Cookie.Path = "/";
                options.ExpireTimeSpan = SessionCookie.Lifetime;
                options.SlidingExpiration = false;

                // Unauthenticated calls get a JSON 401; the static pages in wwwroot send the person to login.html.
                options.Events.OnRedirectToLogin = context => WriteErrorAsync(context.Response, 401, "Требуется вход");
                options.Events.OnRedirectToAccessDenied = context => WriteErrorAsync(context.Response, 403, "Недостаточно прав");

                // A logout bumps the user's session version, which invalidates every cookie issued before it.
                options.Events.OnValidatePrincipal = async context =>
                {
                    var auth = context.HttpContext.RequestServices.GetRequiredService<AuthService>();
                    var principal = context.Principal;
                    var valid = principal is not null
                        && await auth.ValidateSessionAsync(
                            principal.GetUserId(), principal.GetSessionVersion(), context.HttpContext.RequestAborted);
                    if (!valid)
                    {
                        context.RejectPrincipal();
                        await context.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
                    }
                };
            });
        services.AddAuthorization();
        return services;
    }

    private static string ToCamelCase(string path) =>
        string.Join('.', path.Split('.').Select(part => part.Length == 0 ? part : char.ToLowerInvariant(part[0]) + part[1..]));

    private static Task WriteErrorAsync(HttpResponse response, int status, string message)
    {
        response.StatusCode = status;
        return response.WriteAsJsonAsync(new ErrorResponse(message));
    }
}
