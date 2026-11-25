using BugTrack.Data;
using BugTrack.Models;
using BugTrack.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BugTrack.Repositories;

public sealed class NotificationRepository : EfRepository<Notification>, INotificationRepository
{
    public NotificationRepository(BugTrackDbContext db) : base(db) { }

    protected override IQueryable<Notification> Query => Db.Notifications.Include(nameof(Notification.Recipient));

    public async Task<IReadOnlyList<Notification>> FindByRecipientAsync(
        User user, bool unreadOnly, CancellationToken ct = default)
    {
        var userId = user.Id;
        return await Query
            .Where(n => n.Recipient.Id == userId && (!unreadOnly || !n.IsRead))
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync(ct);
    }
}
