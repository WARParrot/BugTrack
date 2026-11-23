using BugTrack.DTO;
using BugTrack.Models.Enums;

namespace BugTrack.Services.Interfaces;

public interface IProjectService
{
    /// <summary>Administrators only; the admin becomes the project's first PROJECT_MANAGER.</summary>
    Task<ProjectDto> CreateProjectAsync(Guid adminId, string name, string description, CancellationToken ct = default);

    /// <summary>Projects the user participates in.</summary>
    Task<IReadOnlyList<ProjectDto>> ListAsync(Guid userId, CancellationToken ct = default);

    /// <summary>Any member of the project.</summary>
    Task<ProjectDto> GetAsync(Guid projectId, Guid userId, CancellationToken ct = default);

    // The methods below require the actor to be a PROJECT_MANAGER of the project.
    Task<ProjectDto> AddMemberAsync(Guid projectId, Guid actorId, string memberEmail, Role role, CancellationToken ct = default);

    Task<ProjectDto> ChangeMemberRoleAsync(Guid projectId, Guid actorId, Guid memberUserId, Role role, CancellationToken ct = default);

    Task RemoveMemberAsync(Guid projectId, Guid actorId, Guid memberUserId, CancellationToken ct = default);

    Task<ProjectDto> LinkRepositoryAsync(Guid projectId, Guid actorId, string name, string url, CancellationToken ct = default);
}
