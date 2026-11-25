using BugTrack.Data;
using BugTrack.Models;
using BugTrack.Repositories.Interfaces;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace BugTrack.Repositories;

public abstract class EfRepository<T> : IRepository<T> where T : Entity
{
    private const int SqliteConstraintError = 19;

    protected EfRepository(BugTrackDbContext db) => Db = db;

    protected BugTrackDbContext Db { get; }

    protected abstract IQueryable<T> Query { get; }

    public virtual async Task<T?> FindByIdAsync(Guid id, CancellationToken ct = default) =>
        await Query.FirstOrDefaultAsync(e => e.Id == id, ct);

    public virtual async Task<IReadOnlyList<T>> FindAllAsync(CancellationToken ct = default) =>
        await Query.ToListAsync(ct);

    public async Task SaveAsync(T entity, CancellationToken ct = default)
    {
        if (Db.Entry(entity).State == EntityState.Detached)
            Db.Set<T>().Add(entity);

        try
        {
            await Db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new DomainException(DomainErrorKind.Conflict, "Данные изменены другим запросом");
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqliteException { SqliteErrorCode: SqliteConstraintError })
        {
            throw new DomainException(DomainErrorKind.Conflict, "Запись уже существует или нарушает ограничения");
        }
    }

    public async Task DeleteAsync(T entity, CancellationToken ct = default)
    {
        Db.Set<T>().Remove(entity);
        try
        {
            await Db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            throw new DomainException(DomainErrorKind.Conflict, "Нельзя удалить запись с зависимыми данными");
        }
    }
}
