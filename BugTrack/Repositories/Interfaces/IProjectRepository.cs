using BugTrack.Models;

namespace BugTrack.Repositories.Interfaces;

public interface IProjectRepository : IRepository<Project>
{
    Task<IReadOnlyList<Project>> FindByParticipantAsync(User user, CancellationToken ct = default);
}
