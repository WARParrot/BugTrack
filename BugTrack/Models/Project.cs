using BugTrack.Models.Enums;

namespace BugTrack.Models;

public class Project : Entity
{
    private readonly List<Membership> _members = new();

    private Project() { }

    public Project(string name, string description, User creator)
    {
        ArgumentNullException.ThrowIfNull(creator);
        Name = Guard.Text(name, "Название", 150);
        Description = (description ?? string.Empty).Trim();
        Guard.Ensure(Description.Length <= 10000, "Описание слишком длинное");
        CreatedAt = DateTime.UtcNow;
        _members.Add(new Membership(creator, this, Role.PROJECT_MANAGER));
    }

    public string Name { get; private set; } = null!;
    public string Description { get; private set; } = null!;
    public DateTime CreatedAt { get; private set; }

    public SourceRepository? Repository { get; private set; }

    public IReadOnlyCollection<Membership> Members => _members;

    public IReadOnlyList<Membership> GetMembersByRole(Role role) =>
        _members.Where(m => m.HasRole(role)).ToList();

    public Membership AddMember(User user, Role role)
    {
        Guard.Ensure(
            _members.All(m => m.User.Id != user.Id),
            "Участник уже в проекте",
            DomainErrorKind.Conflict);
        var member = new Membership(user, this, role);
        _members.Add(member);
        return member;
    }

    public void RemoveMember(User user)
    {
        var member = _members.FirstOrDefault(m => m.User.Id == user.Id);
        Guard.Ensure(member is not null, "Участник не найден", DomainErrorKind.NotFound);
        Guard.Ensure(_members.Count > 1, "Нельзя удалить последнего участника", DomainErrorKind.Conflict);
        if (member.HasRole(Role.PROJECT_MANAGER))
            Guard.Ensure(
                GetMembersByRole(Role.PROJECT_MANAGER).Count > 1,
                "Нельзя удалить последнего менеджера",
                DomainErrorKind.Conflict);
        _members.Remove(member);
    }

    public void ChangeMemberRole(User user, Role role)
    {
        var member = _members.FirstOrDefault(m => m.User.Id == user.Id);
        Guard.Ensure(member is not null, "Участник не найден", DomainErrorKind.NotFound);
        if (member.HasRole(Role.PROJECT_MANAGER) && role != Role.PROJECT_MANAGER)
            Guard.Ensure(
                GetMembersByRole(Role.PROJECT_MANAGER).Count > 1,
                "Нельзя изменить роль последнего менеджера",
                DomainErrorKind.Conflict);
        member.ChangeRole(role);
    }

    public void LinkRepository(SourceRepository repo)
    {
        ArgumentNullException.ThrowIfNull(repo);
        if (Repository is null) Repository = repo;
        else Repository.CopyFrom(repo);
    }
}
