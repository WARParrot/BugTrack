namespace BugTrack.Models;

public class Comment : Entity
{
    private readonly List<Comment> _replies = new();

    private Comment() { } // EF Core

    public Comment(User author, string text)
    {
        Author = author ?? throw new ArgumentNullException(nameof(author));
        Text = Guard.Text(text, "Комментарий", 5000);
        CreatedAt = DateTime.UtcNow;
    }

    public User Author { get; private set; } = null!;
    public string Text { get; private set; } = null!;
    public DateTime CreatedAt { get; private set; }

    /// <summary>Diagram: Comment 0..1 — 0..* Comment ('parent' / 'replies').</summary>
    public Comment? Parent { get; private set; }

    public IReadOnlyCollection<Comment> Replies => _replies;

    /// <remarks>
    /// Prefer <see cref="Ticket.AddReply"/>: it also registers the reply with the ticket,
    /// which is what persists it.
    /// </remarks>
    public Comment AddReply(User author, string text)
    {
        var reply = new Comment(author, text) { Parent = this };
        _replies.Add(reply);
        return reply;
    }
}
