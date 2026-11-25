namespace BugTrack.Models;

public class Comment : Entity
{
    private readonly List<Comment> _replies = new();

    private Comment() { }

    public Comment(User author, string text)
    {
        Author = author ?? throw new ArgumentNullException(nameof(author));
        Text = Guard.Text(text, "Комментарий", 5000);
        CreatedAt = DateTime.UtcNow;
    }

    public User Author { get; private set; } = null!;
    public string Text { get; private set; } = null!;
    public DateTime CreatedAt { get; private set; }

    public Comment? Parent { get; private set; }

    public IReadOnlyCollection<Comment> Replies => _replies;

    public Comment AddReply(User author, string text)
    {
        var reply = new Comment(author, text) { Parent = this };
        _replies.Add(reply);
        return reply;
    }
}
