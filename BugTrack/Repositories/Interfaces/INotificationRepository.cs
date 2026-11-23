using BugTrack.Models;

namespace BugTrack.Repositories.Interfaces;

public interface INotificationRepository : IRepository<Notification>
{
    Task<IReadOnlyList<Notification>> FindByRecipientAsync(User user, bool unreadOnly, CancellationToken ct = default);
}
