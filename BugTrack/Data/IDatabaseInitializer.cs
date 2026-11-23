namespace BugTrack.Data;

/// <summary>Not in the diagram. Creates/prepares the storage on application start.</summary>
public interface IDatabaseInitializer
{
    Task InitializeAsync(CancellationToken ct = default);
}
