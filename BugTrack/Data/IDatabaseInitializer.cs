namespace BugTrack.Data;

public interface IDatabaseInitializer
{
    Task InitializeAsync(CancellationToken ct = default);
}
