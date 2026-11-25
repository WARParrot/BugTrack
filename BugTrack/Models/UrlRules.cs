namespace BugTrack.Models;

internal static class UrlRules
{
    public const int MaxLength = 2048;

    public static bool IsPlainHttp(string url) =>
        url.Length <= MaxLength
        && Uri.TryCreate(url, UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)
        && uri.Host.Length > 0
        && uri.UserInfo.Length == 0;

    public static bool IsRepositoryUrl(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Host.Length == 0) return false;
        return uri.Scheme switch
        {
            "https" => uri.UserInfo.Length == 0,
            "ssh" => !uri.UserInfo.Contains(':'),
            _ => false,
        };
    }
}
