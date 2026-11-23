namespace BugTrack.Models;

public class Notification : Entity
{
    private Notification() { } // EF Core

    public Notification(User recipient, string message)
    {
        Recipient = recipient ?? throw new ArgumentNullException(nameof(recipient));
        Message = Guard.Text(message, "Уведомление", 1000);
        CreatedAt = DateTime.UtcNow;
    }

    public User Recipient { get; private set; } = null!;
    public string Message { get; private set; } = null!;
    public bool IsRead { get; private set; }
    public DateTime CreatedAt { get; private set; }

    public void MarkAsRead() => IsRead = true;
}
