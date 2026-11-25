using BugTrack.DTO;

namespace BugTrack.Services.Interfaces;

public interface INotificationService
{
    Task NotifyAsync(Guid recipientId, string message, CancellationToken ct = default);

    Task NotifyProjectMembersAsync(Guid projectId, string message, CancellationToken ct = default);

    Task<IReadOnlyList<NotificationDto>> ListAsync(Guid userId, bool unreadOnly = false, CancellationToken ct = default);

    Task MarkAsReadAsync(Guid notificationId, Guid userId, CancellationToken ct = default);
}
