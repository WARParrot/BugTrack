using BugTrack.DTO;

namespace BugTrack.DTO.Responses;

// Response envelopes: { "user": {...} }, { "tickets": [...] }, ... (same wire shape as the original API).

public sealed record ErrorResponse(string Error);

public sealed record HealthResponse(bool Ok);

public sealed record UserResponse(UserDto User);

public sealed record ProjectResponse(ProjectDto Project);

public sealed record ProjectsResponse(IReadOnlyList<ProjectDto> Projects);

public sealed record TicketResponse(TicketDto Ticket);

public sealed record TicketsResponse(IReadOnlyList<TicketDto> Tickets);

public sealed record TicketEventsResponse(IReadOnlyList<TicketEventDto> Events);

public sealed record CommentResponse(CommentDto Comment);

public sealed record AttachmentResponse(AttachmentDto Attachment);

public sealed record ReleaseResponse(ReleaseDto Release);

public sealed record ReleasesResponse(IReadOnlyList<ReleaseDto> Releases);

public sealed record NotificationsResponse(IReadOnlyList<NotificationDto> Notifications);
