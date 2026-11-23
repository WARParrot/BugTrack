using BugTrack.Models.Enums;

namespace BugTrack.Models;

public class Membership : Entity
{
    private Membership() { } // EF Core

    public Membership(User user, Project project, Role role)
    {
        Guard.DefinedEnum(role, "Неизвестная роль");
        User = user ?? throw new ArgumentNullException(nameof(user));
        Project = project ?? throw new ArgumentNullException(nameof(project));
        Role = role;
    }

    public User User { get; private set; } = null!;
    public Project Project { get; private set; } = null!;
    public Role Role { get; private set; }

    public void ChangeRole(Role role)
    {
        Guard.DefinedEnum(role, "Неизвестная роль");
        Role = role;
    }

    public bool HasRole(Role role) => Role == role;
}
