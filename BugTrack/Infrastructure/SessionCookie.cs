using System.Globalization;
using System.Security.Claims;
using BugTrack.DTO;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace BugTrack.Infrastructure;

/// <summary>Issues / clears the HttpOnly session cookie.</summary>
public static class SessionCookie
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromHours(8);

    public static Task SignInAsync(HttpContext http, AuthenticationResult result)
    {
        var identity = new ClaimsIdentity(
            new[]
            {
                new Claim(ClaimTypes.NameIdentifier, result.User.Id.ToString()),
                new Claim(SessionClaims.Version, result.SessionVersion.ToString(CultureInfo.InvariantCulture)),
            },
            CookieAuthenticationDefaults.AuthenticationScheme);

        return http.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity),
            new AuthenticationProperties { IsPersistent = true, ExpiresUtc = DateTimeOffset.UtcNow.Add(Lifetime) });
    }

    public static Task SignOutAsync(HttpContext http) =>
        http.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
}
