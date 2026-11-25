namespace BugTrack.Models;

public enum DomainErrorKind
{
    Validation,
    Unauthenticated,
    Forbidden,
    NotFound,
    Conflict,
}

public sealed class DomainException : Exception
{
    public DomainException(DomainErrorKind kind, string message) : base(message) => Kind = kind;

    public DomainErrorKind Kind { get; }
}
