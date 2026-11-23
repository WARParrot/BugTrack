namespace BugTrack.Data;

/// <summary>
/// Not in the diagram. Runs several repository operations atomically
/// (e.g. ticket + event + notifications must be stored together or not at all).
/// </summary>
public interface ITransactions
{
    Task RunAsync(Func<Task> operation, CancellationToken ct = default);
}
