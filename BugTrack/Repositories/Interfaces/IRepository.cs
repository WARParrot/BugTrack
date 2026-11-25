using BugTrack.Models;

namespace BugTrack.Repositories.Interfaces;

public interface IRepository<T> where T : Entity
{
    Task<T?> FindByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<T>> FindAllAsync(CancellationToken ct = default);
    Task SaveAsync(T entity, CancellationToken ct = default);
    Task DeleteAsync(T entity, CancellationToken ct = default);
}
