using BugTrack.Models;
using BugTrack.Models.Enums;

namespace BugTrack.Repositories.Interfaces;

public interface ITicketRepository : IRepository<Ticket>
{
    Task<IReadOnlyList<Ticket>> FindByProjectAsync(Project project, CancellationToken ct = default);
    Task<IReadOnlyList<Ticket>> FindByAssigneeAsync(User user, CancellationToken ct = default);
    Task<IReadOnlyList<Ticket>> FindByStatusAsync(TicketStatus status, CancellationToken ct = default);
}
