using BugTrack.DTO;

namespace BugTrack.Services.Interfaces;

public interface IAuthenticationService
{
    Task<AuthenticationResult> RegisterAsync(string fullName, string email, string password, CancellationToken ct = default);

    Task<AuthenticationResult> AuthenticateAsync(string email, string password, CancellationToken ct = default);

    Task<UserDto> GetUserAsync(Guid userId, CancellationToken ct = default);

    /// <summary>True when the user still exists and the session was not invalidated by a logout.</summary>
    Task<bool> ValidateSessionAsync(Guid userId, int sessionVersion, CancellationToken ct = default);

    /// <summary>Invalidates every session issued to the user.</summary>
    Task LogoutAsync(Guid userId, CancellationToken ct = default);

    /// <summary>Creates the first administrator unless an account with that email already exists.</summary>
    Task EnsureAdminAsync(string fullName, string email, string password, CancellationToken ct = default);
}
