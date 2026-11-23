using BugTrack.DTO;
using BugTrack.Models;
using BugTrack.Models.Enums;
using BugTrack.Repositories.Interfaces;
using BugTrack.Services.Interfaces;

namespace BugTrack.Services;

public sealed class ProjectService : IProjectService
{
    private readonly IProjectRepository _projects;
    private readonly IUserRepository _users;
    private readonly ITicketRepository _tickets;

    // ITicketRepository is not in the diagram: it protects assignees of active tickets from removal.
    public ProjectService(IProjectRepository projects, IUserRepository users, ITicketRepository tickets)
    {
        _projects = projects;
        _users = users;
        _tickets = tickets;
    }

    public async Task<ProjectDto> CreateProjectAsync(
        Guid adminId, string name, string description, CancellationToken ct = default)
    {
        var admin = await RequireUserAsync(adminId, ct);
        Guard.Ensure(admin.IsAdmin, "Создавать проекты может администратор", DomainErrorKind.Forbidden);
        var project = new Project(name, description, admin);
        await _projects.SaveAsync(project, ct);
        return project.ToDto();
    }

    public async Task<IReadOnlyList<ProjectDto>> ListAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await RequireUserAsync(userId, ct);
        return (await _projects.FindByParticipantAsync(user, ct)).Select(p => p.ToDto()).ToList();
    }

    public async Task<ProjectDto> GetAsync(Guid projectId, Guid userId, CancellationToken ct = default)
        => (await RequireAccessAsync(projectId, userId, ct)).ToDto();

    public async Task<ProjectDto> AddMemberAsync(
        Guid projectId, Guid actorId, string memberEmail, Role role, CancellationToken ct = default)
    {
        var project = await RequireManagerAsync(projectId, actorId, ct);
        var user = Guard.Found(
            await _users.FindByEmailAsync(new Email(memberEmail), ct), "Пользователь не найден");
        project.AddMember(user, role);
        await _projects.SaveAsync(project, ct);
        return project.ToDto();
    }

    public async Task<ProjectDto> ChangeMemberRoleAsync(
        Guid projectId, Guid actorId, Guid memberUserId, Role role, CancellationToken ct = default)
    {
        var project = await RequireManagerAsync(projectId, actorId, ct);
        var member = FindMember(project, memberUserId);
        if (member.Role == Role.DEVELOPER && role != Role.DEVELOPER)
            Guard.Ensure(
                !await HasActiveTicketsAsync(project, member.User, ct),
                "Нельзя изменить роль исполнителя активного тикета",
                DomainErrorKind.Conflict);
        project.ChangeMemberRole(member.User, role);
        await _projects.SaveAsync(project, ct);
        return project.ToDto();
    }

    public async Task RemoveMemberAsync(
        Guid projectId, Guid actorId, Guid memberUserId, CancellationToken ct = default)
    {
        var project = await RequireManagerAsync(projectId, actorId, ct);
        var member = FindMember(project, memberUserId);
        Guard.Ensure(
            !await HasActiveTicketsAsync(project, member.User, ct),
            "Нельзя удалить исполнителя активного тикета",
            DomainErrorKind.Conflict);
        project.RemoveMember(member.User);
        await _projects.SaveAsync(project, ct);
    }

    public async Task<ProjectDto> LinkRepositoryAsync(
        Guid projectId, Guid actorId, string name, string url, CancellationToken ct = default)
    {
        var project = await RequireManagerAsync(projectId, actorId, ct);
        project.LinkRepository(new SourceRepository(name, url));
        await _projects.SaveAsync(project, ct);
        return project.ToDto();
    }

    // ---- helpers ------------------------------------------------------------------------------

    private async Task<User> RequireUserAsync(Guid userId, CancellationToken ct) =>
        Guard.Found(await _users.FindByIdAsync(userId, ct), "Требуется вход", DomainErrorKind.Unauthenticated);

    private async Task<Project> RequireAccessAsync(Guid projectId, Guid userId, CancellationToken ct)
    {
        var project = Guard.Found(await _projects.FindByIdAsync(projectId, ct), "Проект не найден");
        Guard.Ensure(
            project.Members.Any(m => m.User.Id == userId),
            "Нет доступа к проекту",
            DomainErrorKind.Forbidden);
        return project;
    }

    private async Task<Project> RequireManagerAsync(Guid projectId, Guid userId, CancellationToken ct)
    {
        var project = await RequireAccessAsync(projectId, userId, ct);
        Guard.Ensure(
            project.Members.Any(m => m.User.Id == userId && m.HasRole(Role.PROJECT_MANAGER)),
            "Требуется менеджер проекта",
            DomainErrorKind.Forbidden);
        return project;
    }

    private static Membership FindMember(Project project, Guid userId) =>
        Guard.Found(project.Members.FirstOrDefault(m => m.User.Id == userId), "Участник не найден");

    private async Task<bool> HasActiveTicketsAsync(Project project, User assignee, CancellationToken ct) =>
        (await _tickets.FindByAssigneeAsync(assignee, ct)).Any(t =>
            t.Project.Id == project.Id && t.Status is not (TicketStatus.CLOSED or TicketStatus.ARCHIVED));
}
