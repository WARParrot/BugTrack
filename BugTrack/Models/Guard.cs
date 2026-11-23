using System.Diagnostics.CodeAnalysis;

namespace BugTrack.Models;

public static class Guard
{
    public static void Ensure(
        [DoesNotReturnIf(false)] bool condition,
        string message,
        DomainErrorKind kind = DomainErrorKind.Validation)
    {
        if (!condition) throw new DomainException(kind, message);
    }

    /// <summary>Returns <paramref name="value"/> or throws NotFound (by default) when it is null.</summary>
    public static T Found<T>(T? value, string message, DomainErrorKind kind = DomainErrorKind.NotFound)
        where T : class
        => value ?? throw new DomainException(kind, message);

    /// <summary>Trims the value and enforces a maximum length (and non-emptiness unless allowed).</summary>
    public static string Text(string? value, string label, int max = 10000, bool allowEmpty = false)
    {
        var result = (value ?? string.Empty).Trim();
        Ensure(
            (allowEmpty || result.Length > 0) && result.Length <= max,
            $"{label}: до {max} символов{(allowEmpty ? "" : " (не пустое значение)")}");
        return result;
    }

    public static void DefinedEnum<TEnum>(TEnum value, string message) where TEnum : struct, Enum
        => Ensure(Enum.IsDefined(value), message);
}
