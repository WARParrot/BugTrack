namespace BugTrack.Models;

/// <summary>Diagram: «value object» Deadline — dueAt : LocalDateTime (stored and exposed as UTC).</summary>
public sealed class Deadline
{
    private Deadline() { } // EF Core

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
