namespace BugTrack.Models;

public sealed class Deadline
{
    private Deadline() { }

    public Deadline(DateTime dueAt)
    {
        Guard.Ensure(dueAt != default, "Некорректный срок");
        DueAt = dueAt.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(dueAt, DateTimeKind.Utc)
            : dueAt.ToUniversalTime();
    }

    public DateTime DueAt { get; private set; }

    public bool IsOverdue() => DueAt < DateTime.UtcNow;
}
