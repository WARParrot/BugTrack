using BugTrack.Models;

namespace BugTrack.Repositories.Interfaces;

public interface IUserRepository : IRepository<User>
{
    Task<User?> FindByEmailAsync(Email email, CancellationToken ct = default);
}
