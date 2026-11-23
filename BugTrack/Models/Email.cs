using System.Text.RegularExpressions;

namespace BugTrack.Models;

/// <summary>Diagram: «value object» Email — value : String.</summary>
public sealed partial class Email : IEquatable<Email>
{
    public Email(string value)
    {
        var normalized = (value ?? string.Empty).Trim().ToLowerInvariant();
        Guard.Ensure(normalized.Length <= 254 && Pattern().IsMatch(normalized), "Некорректный email");
        Value = normalized;
    }

    /// <summary>Lower-cased, trimmed address (diagram: <c>getValue()</c>).</summary>
    public string Value { get; }

    public bool Equals(Email? other) => other is not null && Value == other.Value;
    public override bool Equals(object? obj) => Equals(obj as Email);
    public override int GetHashCode() => Value.GetHashCode();
    public override string ToString() => Value;

    [GeneratedRegex(@"^[^\s@]+@[^\s@]+\.[^\s@]+$")]
    private static partial Regex Pattern();
}
