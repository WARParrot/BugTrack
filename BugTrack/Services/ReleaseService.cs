using BugTrack.DTO;
using BugTrack.Models;
using BugTrack.Repositories.Interfaces;
using BugTrack.Services.Interfaces;

namespace BugTrack.Services;

public sealed class ReleaseService : IReleaseService
{
    private readonly IReleaseRepository _releases;
    private readonly IUserRepository _users;

    public ReleaseService(IReleaseRepository releases, IUserRepository users)
    {
        _releases = releases;
        _users = users;
    }

    public async Task<IReadOnlyList<ReleaseDto>> ListAsync(CancellationToken ct = default) =>
        (await _releases.FindAllAsync(ct)).Select(r => r.ToDto()).ToList();

    public async Task<ReleaseDto> CreateAsync(
        Guid actorId, string version, DateOnly releasedAt, CancellationToken ct = default)
    {
        var actor = Guard.Found(
            await _users.FindByIdAsync(actorId, ct), "Требуется вход", DomainErrorKind.Unauthenticated);
        Guard.Ensure(actor.IsAdmin, "Требуется администратор", DomainErrorKind.Forbidden);

        var release = new Release(version, releasedAt);
        Guard.Ensure(
            await _releases.FindByVersionAsync(release.Version, ct) is null,
            "Версия уже существует",
            DomainErrorKind.Conflict);
        await _releases.SaveAsync(release, ct);
        return release.ToDto();
    }
}
