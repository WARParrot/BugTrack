namespace BugTrack.Models;

public class User : Entity
{
    private User() { }

    public User(string fullName, Email email, string passwordHash)
    {
        FullName = Guard.Text(fullName, "Имя", 100);
        Email = email ?? throw new ArgumentNullException(nameof(email));
        PasswordHash = Guard.Text(passwordHash, "Хеш пароля", 512);
        CreatedAt = DateTime.UtcNow;
    }

    public string FullName { get; private set; } = null!;
    public Email Email { get; private set; } = null!;
    public string PasswordHash { get; private set; } = null!;
    public bool IsAdmin { get; private set; }
    public DateTime CreatedAt { get; private set; }

    public int SessionVersion { get; private set; }

    public static User CreateAdmin(string fullName, Email email, string passwordHash)
        => new(fullName, email, passwordHash) { IsAdmin = true };

    public void ChangePassword(string newHash) => PasswordHash = Guard.Text(newHash, "Хеш пароля", 512);

    public void InvalidateSessions() => SessionVersion++;
}
