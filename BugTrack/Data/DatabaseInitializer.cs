using Microsoft.EntityFrameworkCore;

namespace BugTrack.Data;

/// <summary>
/// Prepares the database on start. Once migrations exist in the Migrations folder
/// (<c>dotnet ef migrations add InitialCreate</c>) they are applied; until then the schema
/// is created directly from the model.
/// </summary>
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
