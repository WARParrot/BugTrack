using BugTrack.Data;
using BugTrack.Models;
using BugTrack.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BugTrack.Repositories;

public sealed class ProjectRepository : EfRepository<Project>, IProjectRepository
{
    public ProjectRepository(BugTrackDbContext db) : base(db) { }

    protected override IQueryable<Project> Query => Db.Projects
        .Include($"{nameof(Project.Members)}.{nameof(Membership.User)}")
        .Include(nameof(Project.Repository));

    public async Task<IReadOnlyList<Project>> FindByParticipantAsync(User user, CancellationToken ct = default)
    {
        var userId = user.Id;
        return await Query
            .Where(p => p.Members.Any(m => m.User.Id == userId))
            .OrderBy(p => p.CreatedAt)
            .ToListAsync(ct);
    }
}
