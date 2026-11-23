namespace BugTrack.DTO;

public sealed record NotificationDto(Guid Id, string Message, bool IsRead, DateTime CreatedAt);
