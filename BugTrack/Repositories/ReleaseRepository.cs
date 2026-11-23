using BugTrack.Data;
using BugTrack.Models;
using BugTrack.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BugTrack.Repositories;

public sealed class ReleaseRepository : EfRepository<Release>, IReleaseRepository
{
    public ReleaseRepository(BugTrackDbContext db) : base(db) { }

    protected override IQueryable<Release> Query => Db.Releases;

    public override async Task<IReadOnlyList<Release>> FindAllAsync(CancellationToken ct = default) =>
        await Query.OrderBy(r => r.ReleasedAt).ThenBy(r => r.Version).ToListAsync(ct);

    public async Task<Release?> FindByVersionAsync(string version, CancellationToken ct = default) =>
        await Db.Releases.FirstOrDefaultAsync(r => r.Version == version, ct);
}
