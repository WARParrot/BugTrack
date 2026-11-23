using BugTrack.Models;

namespace BugTrack.Repositories.Interfaces;

public interface ITicketEventRepository : IRepository<TicketEvent>
{
    Task<IReadOnlyList<TicketEvent>> FindByTicketAsync(Ticket ticket, CancellationToken ct = default);
}
