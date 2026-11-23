using BugTrack.DTO;

namespace BugTrack.Services.Interfaces;

/// <summary>Not in the diagram: wraps ReleaseRepository so controllers never touch repositories.</summary>
public interface IReleaseService
{
    Task<IReadOnlyList<ReleaseDto>> ListAsync(CancellationToken ct = default);

    /// <summary>Administrators only.</summary>
    Task<ReleaseDto> CreateAsync(Guid actorId, string version, DateOnly releasedAt, CancellationToken ct = default);
}
