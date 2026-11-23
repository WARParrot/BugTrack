using BugTrack.DTO;
using BugTrack.Models;
using BugTrack.Repositories.Interfaces;
using BugTrack.Services.Interfaces;

namespace BugTrack.Services;

public sealed class NotificationService : INotificationService
{
    private readonly INotificationRepository _notifications;
    private readonly IUserRepository _users;
    private readonly IProjectRepository _projects;

    // Besides INotificationRepository (diagram) this needs users/projects to resolve ids to entities.
    public NotificationService(
        INotificationRepository notifications, IUserRepository users, IProjectRepository projects)
    {
        _notifications = notifications;
        _users = users;
        _projects = projects;
    }

    public async Task NotifyAsync(Guid recipientId, string message, CancellationToken ct = default)
    {
        var recipient = Guard.Found(await _users.FindByIdAsync(recipientId, ct), "Получатель не найден");
        await _notifications.SaveAsync(new Notification(recipient, message), ct);
    }

    public async Task NotifyProjectMembersAsync(Guid projectId, string message, CancellationToken ct = default)
    {
        var project = Guard.Found(await _projects.FindByIdAsync(projectId, ct), "Проект не найден");
        foreach (var member in project.Members)
            await _notifications.SaveAsync(new Notification(member.User, message), ct);
    }

    public async Task<IReadOnlyList<NotificationDto>> ListAsync(
        Guid userId, bool unreadOnly = false, CancellationToken ct = default)
    {
        var user = await RequireUserAsync(userId, ct);
        var items = await _notifications.FindByRecipientAsync(user, unreadOnly, ct);
        return items.Select(n => n.ToDto()).ToList();
    }

    public async Task MarkAsReadAsync(Guid notificationId, Guid userId, CancellationToken ct = default)
    {
        var notification = await _notifications.FindByIdAsync(notificationId, ct);
        Guard.Ensure(
            notification is not null && notification.Recipient.Id == userId,
            "Уведомление не найдено",
            DomainErrorKind.NotFound);
        notification.MarkAsRead();
        await _notifications.SaveAsync(notification, ct);
    }

    private async Task<User> RequireUserAsync(Guid userId, CancellationToken ct) =>
        Guard.Found(await _users.FindByIdAsync(userId, ct), "Требуется вход", DomainErrorKind.Unauthenticated);
}
