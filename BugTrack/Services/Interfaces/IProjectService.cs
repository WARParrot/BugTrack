using BugTrack.DTO;
using BugTrack.Models.Enums;

namespace BugTrack.Services.Interfaces;

public interface IProjectService
{
    Task<ProjectDto> CreateProjectAsync(Guid adminId, string name, string description, CancellationToken ct = default);

    Task<IReadOnlyList<ProjectDto>> ListAsync(Guid userId, CancellationToken ct = default);

    Task<ProjectDto> GetAsync(Guid projectId, Guid userId, CancellationToken ct = default);

    Task<ProjectDto> AddMemberAsync(Guid projectId, Guid actorId, string memberEmail, Role role, CancellationToken ct = default);

    Task<ProjectDto> ChangeMemberRoleAsync(Guid projectId, Guid actorId, Guid memberUserId, Role role, CancellationToken ct = default);

    Task RemoveMemberAsync(Guid projectId, Guid actorId, Guid memberUserId, CancellationToken ct = default);

    Task<ProjectDto> LinkRepositoryAsync(Guid projectId, Guid actorId, string name, string url, CancellationToken ct = default);
}
