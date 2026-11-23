using BugTrack.Data;
using BugTrack.Models;
using BugTrack.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BugTrack.Repositories;

public sealed class TicketEventRepository : EfRepository<TicketEvent>, ITicketEventRepository
{
    public TicketEventRepository(BugTrackDbContext db) : base(db) { }

    protected override IQueryable<TicketEvent> Query => Db.TicketEvents
        .Include(nameof(TicketEvent.Ticket))
        .Include(nameof(TicketEvent.Actor));

    public async Task<IReadOnlyList<TicketEvent>> FindByTicketAsync(Ticket ticket, CancellationToken ct = default)
    {
        var ticketId = ticket.Id;
        return await Query.Where(e => e.Ticket.Id == ticketId).OrderBy(e => e.OccurredAt).ToListAsync(ct);
    }
}
