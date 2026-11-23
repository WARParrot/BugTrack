using BugTrack.Data;
using BugTrack.Models;
using BugTrack.Models.Enums;
using BugTrack.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BugTrack.Repositories;

public sealed class TicketRepository : EfRepository<Ticket>, ITicketRepository
{
    public TicketRepository(BugTrackDbContext db) : base(db) { }

    protected override IQueryable<Ticket> Query => Db.Tickets
        .Include($"{nameof(Ticket.Project)}.{nameof(Project.Members)}.{nameof(Membership.User)}")
        .Include(nameof(Ticket.Reporter))
        .Include(nameof(Ticket.Assignee))
        .Include(nameof(Ticket.Release))
        .Include($"{nameof(Ticket.Comments)}.{nameof(Comment.Author)}")
        .Include($"{nameof(Ticket.Attachments)}.{nameof(Attachment.UploadedBy)}");

    public async Task<IReadOnlyList<Ticket>> FindByProjectAsync(Project project, CancellationToken ct = default)
    {
        var projectId = project.Id;
        return await Query.Where(t => t.Project.Id == projectId).OrderBy(t => t.CreatedAt).ToListAsync(ct);
    }

    public async Task<IReadOnlyList<Ticket>> FindByAssigneeAsync(User user, CancellationToken ct = default)
    {
        var userId = user.Id;
        return await Query
            .Where(t => t.Assignee != null && t.Assignee.Id == userId)
            .OrderBy(t => t.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<Ticket>> FindByStatusAsync(TicketStatus status, CancellationToken ct = default) =>
        await Query.Where(t => t.Status == status).OrderBy(t => t.CreatedAt).ToListAsync(ct);
}
