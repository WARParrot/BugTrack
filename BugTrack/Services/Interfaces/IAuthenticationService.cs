using BugTrack.DTO;

namespace BugTrack.Services.Interfaces;

public interface IAuthenticationService
{
    Task<AuthenticationResult> RegisterAsync(string fullName, string email, string password, CancellationToken ct = default);

    Task<AuthenticationResult> AuthenticateAsync(string email, string password, CancellationToken ct = default);

    Task<UserDto> GetUserAsync(Guid userId, CancellationToken ct = default);

    Task<bool> ValidateSessionAsync(Guid userId, int sessionVersion, CancellationToken ct = default);

    Task LogoutAsync(Guid userId, CancellationToken ct = default);

    Task EnsureAdminAsync(string fullName, string email, string password, CancellationToken ct = default);
}
