using Microsoft.EntityFrameworkCore;

namespace BugTrack.Data;

public sealed class DatabaseInitializer : IDatabaseInitializer
{
    private readonly BugTrackDbContext _db;

    public DatabaseInitializer(BugTrackDbContext db) => _db = db;

    public async Task InitializeAsync(CancellationToken ct = default)
    {
        if (_db.Database.GetMigrations().Any())
            await _db.Database.MigrateAsync(ct);
        else
            await _db.Database.EnsureCreatedAsync(ct);
    }
}
