using System.Security.Claims;

namespace BugTrack.Infrastructure;

public static class SessionClaims
{
    public const string Version = "bugtrack:session_version";
}

public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal principal) =>
        Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    public static int GetSessionVersion(this ClaimsPrincipal principal) =>
        int.TryParse(principal.FindFirstValue(SessionClaims.Version), out var v) ? v : -1;
}
