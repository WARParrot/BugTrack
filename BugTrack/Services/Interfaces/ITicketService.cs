using BugTrack.DTO;
using BugTrack.Models.Enums;

namespace BugTrack.Services.Interfaces;

/// <summary>
/// Every method takes the acting user's id. Reading/changing a ticket also requires the actor
/// to be a member of the ticket's project; role requirements are listed per method.
/// </summary>
public interface ITicketService
{
    Task<TicketDto> CreateTicketAsync(
        Guid projectId, Guid reporterId, string title, string description,
        TicketPriority priority, string? stepsToReproduce, CancellationToken ct = default);

    Task<IReadOnlyList<TicketDto>> ListAsync(Guid projectId, Guid actorId, CancellationToken ct = default);

    Task<TicketDto> GetAsync(Guid ticketId, Guid actorId, CancellationToken ct = default);

    Task<IReadOnlyList<TicketEventDto>> HistoryAsync(Guid ticketId, Guid actorId, CancellationToken ct = default);

    // ---- workflow -------------------------------------------------------------------------------
    /// <summary>PROJECT_MANAGER assigns a DEVELOPER of the project.</summary>
    Task<TicketDto> AssignTicketAsync(Guid ticketId, Guid managerId, Guid developerId, CancellationToken ct = default);

    /// <summary>The assigned DEVELOPER starts work.</summary>
    Task<TicketDto> TakeOnAsync(Guid ticketId, Guid developerId, CancellationToken ct = default);

    Task<TicketDto> DeclineTicketAsync(Guid ticketId, Guid developerId, string reason, CancellationToken ct = default);

    Task<TicketDto> SubmitFixAsync(Guid ticketId, Guid developerId, string mrUrl, CancellationToken ct = default);

    /// <summary>A TESTER accepts the fix.</summary>
    Task<TicketDto> VerifyAndCloseAsync(Guid ticketId, Guid testerId, CancellationToken ct = default);

    /// <summary>A TESTER sends the ticket back to development.</summary>
    Task<TicketDto> RequestReworkAsync(Guid ticketId, Guid testerId, string reason, CancellationToken ct = default);

    Task<TicketDto> ArchiveAsync(Guid ticketId, Guid managerId, CancellationToken ct = default);

    // ---- manager-only properties (no ticket event is recorded for these) -------------------------
    Task<TicketDto> SetDeadlineAsync(Guid ticketId, Guid actorId, DateTimeOffset deadline, CancellationToken ct = default);

    Task<TicketDto> SetPriorityAsync(Guid ticketId, Guid actorId, TicketPriority priority, CancellationToken ct = default);

    Task<TicketDto> SetReleaseAsync(Guid ticketId, Guid actorId, string releaseVersion, CancellationToken ct = default);

    // ---- collaboration (any project member) --------------------------------------------------------
    Task<CommentDto> AddCommentAsync(Guid ticketId, Guid actorId, string text, Guid? parentCommentId, CancellationToken ct = default);

    Task<AttachmentDto> AddAttachmentAsync(Guid ticketId, Guid actorId, AttachmentType type, string url, CancellationToken ct = default);
}
