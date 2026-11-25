using BugTrack.Data;
using Microsoft.EntityFrameworkCore;

namespace BugTrack.Data;

public sealed class EfTransactions : ITransactions
{
    private readonly BugTrackDbContext _db;

    public EfTransactions(BugTrackDbContext db) => _db = db;

    public async Task RunAsync(Func<Task> operation, CancellationToken ct = default)
    {
        if (_db.Database.CurrentTransaction is not null)
        {
            await operation();
            return;
        }

        await using var transaction = await _db.Database.BeginTransactionAsync(ct);
        await operation();
        await transaction.CommitAsync(ct);
    }
}
