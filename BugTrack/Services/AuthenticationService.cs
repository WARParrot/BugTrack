using BugTrack.DTO;
using BugTrack.Models;
using BugTrack.Repositories.Interfaces;
using BugTrack.Services.Interfaces;

namespace BugTrack.Services;

public sealed class AuthenticationService : IAuthenticationService
{
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _hasher;

    public AuthenticationService(IUserRepository users, IPasswordHasher hasher)
    {
        _users = users;
        _hasher = hasher;
    }

    public async Task<AuthenticationResult> RegisterAsync(
        string fullName, string email, string password, CancellationToken ct = default)
    {
        var address = new Email(email);
        Guard.Ensure(
            await _users.FindByEmailAsync(address, ct) is null,
            "Email уже зарегистрирован",
            DomainErrorKind.Conflict);

        var user = new User(fullName, address, _hasher.Hash(password));
        await _users.SaveAsync(user, ct);
        return new AuthenticationResult(user.ToDto(), user.SessionVersion);
    }

    public async Task<AuthenticationResult> AuthenticateAsync(
        string email, string password, CancellationToken ct = default)
    {
        var user = await _users.FindByEmailAsync(new Email(email), ct);

        var passwordOk = _hasher.Verify(password, user?.PasswordHash);
        if (user is null || !passwordOk)
            throw new DomainException(DomainErrorKind.Unauthenticated, "Неверный email или пароль");

        return new AuthenticationResult(user.ToDto(), user.SessionVersion);
    }

    public async Task<UserDto> GetUserAsync(Guid userId, CancellationToken ct = default)
    {
        var user = Guard.Found(
            await _users.FindByIdAsync(userId, ct), "Требуется вход", DomainErrorKind.Unauthenticated);
        return user.ToDto();
    }

    public async Task<bool> ValidateSessionAsync(Guid userId, int sessionVersion, CancellationToken ct = default)
    {
        var user = await _users.FindByIdAsync(userId, ct);
        return user is not null && user.SessionVersion == sessionVersion;
    }

    public async Task LogoutAsync(Guid userId, CancellationToken ct = default)
    {
        var user = Guard.Found(
            await _users.FindByIdAsync(userId, ct), "Требуется вход", DomainErrorKind.Unauthenticated);
        user.InvalidateSessions();
        await _users.SaveAsync(user, ct);
    }

    public async Task EnsureAdminAsync(string fullName, string email, string password, CancellationToken ct = default)
    {
        var address = new Email(email);
        if (await _users.FindByEmailAsync(address, ct) is not null) return;

        Guard.Ensure(password.Length >= 12, "Admin:Password: минимум 12 символов");
        await _users.SaveAsync(User.CreateAdmin(fullName, address, _hasher.Hash(password)), ct);
    }
}
