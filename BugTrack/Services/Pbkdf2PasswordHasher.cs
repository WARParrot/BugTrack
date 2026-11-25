using System.Security.Cryptography;
using BugTrack.Services.Interfaces;

namespace BugTrack.Services;

public sealed class Pbkdf2PasswordHasher : IPasswordHasher
{
    private const string Prefix = "pbkdf2-sha512";
    private const int Iterations = 210_000;
    private const int MaxAcceptedIterations = 5_000_000;
    private const int SaltSize = 16;
    private const int KeySize = 32;

    private static readonly Lazy<string> DummyHash = new(() => new Pbkdf2PasswordHasher().Hash("dummy-password"));

    public string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var key = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA512, KeySize);
        return $"{Prefix}${Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(key)}";
    }

    public bool Verify(string password, string? hash)
    {
        var unknownAccount = hash is null;
        var parts = (hash ?? DummyHash.Value).Split('$');
        if (parts.Length != 4 || parts[0] != Prefix
            || !int.TryParse(parts[1], out var iterations) || iterations is < 1 or > MaxAcceptedIterations)
            return false;

        try
        {
            var salt = Convert.FromBase64String(parts[2]);
            var expected = Convert.FromBase64String(parts[3]);
            var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA512, expected.Length);
            return CryptographicOperations.FixedTimeEquals(actual, expected) && !unknownAccount;
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
