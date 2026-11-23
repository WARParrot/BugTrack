namespace BugTrack.Models;

public enum DomainErrorKind
{
    Validation,
    Unauthenticated,
    Forbidden,
    NotFound,
    Conflict,
}

/// <summary>
/// A business-rule violation. The domain only says <em>what kind</em> of failure it is;
/// the API layer decides which HTTP status that maps to.
/// </summary>
public sealed class DomainException : Exception
{
    public DomainException(DomainErrorKind kind, string message) : base(message) => Kind = kind;

    public DomainErrorKind Kind { get; }
}
