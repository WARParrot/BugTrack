using BugTrack.Models;

namespace BugTrack.Repositories.Interfaces;

public interface IReleaseRepository : IRepository<Release>
{
    Task<Release?> FindByVersionAsync(string version, CancellationToken ct = default);
}
