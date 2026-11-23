namespace BugTrack.Models;

public class Release : Entity
{
    private Release() { } // EF Core

    public Release(string version, DateOnly releasedAt)
    {
        Version = Guard.Text(version, "Версия", 100);
        ReleasedAt = releasedAt;
    }

    public string Version { get; private set; } = null!;
    public DateOnly ReleasedAt { get; private set; }
}
