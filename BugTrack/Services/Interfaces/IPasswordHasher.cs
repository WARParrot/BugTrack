namespace BugTrack.Services.Interfaces;

/// <summary>Not in the diagram. Password hashing is an infrastructure concern.</summary>
public interface IPasswordHasher
{
    string Hash(string password);

    /// <summary>
    /// Verifies a password. When <paramref name="hash"/> is null (unknown account) it still
    /// performs a full-cost computation so response time does not reveal which emails exist.
    /// </summary>
    bool Verify(string password, string? hash);
}
