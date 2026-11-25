namespace BugTrack.Data;

public interface ITransactions
{
    Task RunAsync(Func<Task> operation, CancellationToken ct = default);
}
