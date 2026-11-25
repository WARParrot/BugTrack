using BugTrack.DTO;
using BugTrack.Data;
using BugTrack.Models;
using BugTrack.Models.Enums;
using BugTrack.Repositories.Interfaces;
using BugTrack.Services.Interfaces;

namespace BugTrack.Services;

public sealed class TicketService : ITicketService
{
    private readonly ITicketRepository _tickets;
    private readonly ITicketEventRepository _events;
    private readonly IReleaseRepository _releases;
    private readonly INotificationService _notifications;

    private readonly IProjectRepository _projects;
    private readonly IUserRepository _users;
    private readonly ITransactions _transactions;

    public TicketService(
        ITicketRepository tickets,
        ITicketEventRepository events,
        IReleaseRepository releases,
        INotificationService notifications,
        IProjectRepository projects,
        IUserRepository users,
        ITransactions transactions)
    {
        _tickets = tickets;
        _events = events;
        _releases = releases;
        _notifications = notifications;
        _projects = projects;
        _users = users;
        _transactions = transactions;
    }

    public async Task<TicketDto> CreateTicketAsync(
        Guid projectId, Guid reporterId, string title, string description,
        TicketPriority priority, string? stepsToReproduce, CancellationToken ct = default)
    {
        var reporter = await RequireUserAsync(reporterId, ct);
        var project = await RequireProjectAccessAsync(projectId, reporter, ct);
        var ticket = new Ticket(project, reporter, title, description, priority, stepsToReproduce ?? "");

        await _transactions.RunAsync(async () =>
        {
            await _tickets.SaveAsync(ticket, ct);
            await _events.SaveAsync(new TicketEvent(ticket, reporter, TicketEventType.CREATED, null), ct);
            await _notifications.NotifyProjectMembersAsync(project.Id, $"Создан тикет: {ticket.Title}", ct);
        }, ct);

        return ticket.ToDto();
    }

    public async Task<IReadOnlyList<TicketDto>> ListAsync(Guid projectId, Guid actorId, CancellationToken ct = default)
    {
        var actor = await RequireUserAsync(actorId, ct);
        var project = await RequireProjectAccessAsync(projectId, actor, ct);
        return (await _tickets.FindByProjectAsync(project, ct)).Select(t => t.ToDto()).ToList();
    }

    public async Task<TicketDto> GetAsync(Guid ticketId, Guid actorId, CancellationToken ct = default)
    {
        var (ticket, _) = await LoadAsync(ticketId, actorId, ct);
        return ticket.ToDto();
    }

    public async Task<IReadOnlyList<TicketEventDto>> HistoryAsync(Guid ticketId, Guid actorId, CancellationToken ct = default)
    {
        var (ticket, _) = await LoadAsync(ticketId, actorId, ct);
        return (await _events.FindByTicketAsync(ticket, ct)).Select(e => e.ToDto()).ToList();
    }

    public async Task<TicketDto> AssignTicketAsync(Guid ticketId, Guid managerId, Guid developerId, CancellationToken ct = default)
    {
        var (ticket, manager) = await LoadAsync(ticketId, managerId, ct);
        var developer = Guard.Found(await _users.FindByIdAsync(developerId, ct), "Разработчик не найден");
        ticket.Assign(manager, developer);
        return await PersistTransitionAsync(ticket, manager, TicketEventType.ASSIGNED, developer.FullName, ct);
    }

    public async Task<TicketDto> TakeOnAsync(Guid ticketId, Guid developerId, CancellationToken ct = default)
    {
        var (ticket, developer) = await LoadAsync(ticketId, developerId, ct);
        ticket.TakeOn(developer);
        return await PersistTransitionAsync(ticket, developer, TicketEventType.TAKEN, null, ct);
    }

    public async Task<TicketDto> DeclineTicketAsync(Guid ticketId, Guid developerId, string reason, CancellationToken ct = default)
    {
        var (ticket, developer) = await LoadAsync(ticketId, developerId, ct);
        ticket.Decline(developer, reason);
        return await PersistTransitionAsync(ticket, developer, TicketEventType.DECLINED, reason.Trim(), ct);
    }

    public async Task<TicketDto> SubmitFixAsync(Guid ticketId, Guid developerId, string mrUrl, CancellationToken ct = default)
    {
        var (ticket, developer) = await LoadAsync(ticketId, developerId, ct);
        ticket.SubmitFix(developer, mrUrl);
        return await PersistTransitionAsync(ticket, developer, TicketEventType.FIX_SUBMITTED, mrUrl.Trim(), ct);
    }

    public async Task<TicketDto> VerifyAndCloseAsync(Guid ticketId, Guid testerId, CancellationToken ct = default)
    {
        var (ticket, tester) = await LoadAsync(ticketId, testerId, ct);
        ticket.Close(tester);
        return await PersistTransitionAsync(ticket, tester, TicketEventType.CLOSED, null, ct);
    }

    public async Task<TicketDto> RequestReworkAsync(Guid ticketId, Guid testerId, string reason, CancellationToken ct = default)
    {
        var (ticket, tester) = await LoadAsync(ticketId, testerId, ct);
        ticket.Reopen(tester, reason);
        return await PersistTransitionAsync(ticket, tester, TicketEventType.REOPENED, reason.Trim(), ct);
    }

    public async Task<TicketDto> ArchiveAsync(Guid ticketId, Guid managerId, CancellationToken ct = default)
    {
        var (ticket, manager) = await LoadAsync(ticketId, managerId, ct);
        ticket.Archive(manager);
        return await PersistTransitionAsync(ticket, manager, TicketEventType.ARCHIVED, null, ct);
    }

    public async Task<TicketDto> SetDeadlineAsync(Guid ticketId, Guid actorId, DateTimeOffset deadline, CancellationToken ct = default)
    {
        var (ticket, _) = await LoadManagedAsync(ticketId, actorId, ct);
        ticket.SetDeadline(new Deadline(deadline.UtcDateTime));
        await _tickets.SaveAsync(ticket, ct);
        return ticket.ToDto();
    }

    public async Task<TicketDto> SetPriorityAsync(Guid ticketId, Guid actorId, TicketPriority priority, CancellationToken ct = default)
    {
        var (ticket, _) = await LoadManagedAsync(ticketId, actorId, ct);
        ticket.SetPriority(priority);
        await _tickets.SaveAsync(ticket, ct);
        return ticket.ToDto();
    }

    public async Task<TicketDto> SetReleaseAsync(Guid ticketId, Guid actorId, string releaseVersion, CancellationToken ct = default)
    {
        var (ticket, _) = await LoadManagedAsync(ticketId, actorId, ct);
        var release = Guard.Found(await _releases.FindByVersionAsync(releaseVersion.Trim(), ct), "Релиз не найден");
        ticket.SetRelease(release);
        await _tickets.SaveAsync(ticket, ct);
        return ticket.ToDto();
    }

    public async Task<CommentDto> AddCommentAsync(
        Guid ticketId, Guid actorId, string text, Guid? parentCommentId, CancellationToken ct = default)
    {
        var (ticket, actor) = await LoadAsync(ticketId, actorId, ct);
        var comment = parentCommentId is { } parentId
            ? ticket.AddReply(parentId, actor, text)
            : ticket.AddComment(actor, text);
        await _tickets.SaveAsync(ticket, ct);
        return comment.ToDto();
    }

    public async Task<AttachmentDto> AddAttachmentAsync(
        Guid ticketId, Guid actorId, AttachmentType type, string url, CancellationToken ct = default)
    {
        var (ticket, actor) = await LoadAsync(ticketId, actorId, ct);
        var attachment = ticket.AddAttachment(actor, type, url);
        await _tickets.SaveAsync(ticket, ct);
        return attachment.ToDto();
    }

    private async Task<TicketDto> PersistTransitionAsync(
        Ticket ticket, User actor, TicketEventType type, string? note, CancellationToken ct)
    {
        await _transactions.RunAsync(async () =>
        {
            await _tickets.SaveAsync(ticket, ct);
            await _events.SaveAsync(new TicketEvent(ticket, actor, type, note), ct);
            await _notifications.NotifyProjectMembersAsync(ticket.Project.Id, $"{ticket.Title}: {type}", ct);
        }, ct);
        return ticket.ToDto();
    }

    private async Task<User> RequireUserAsync(Guid userId, CancellationToken ct) =>
        Guard.Found(await _users.FindByIdAsync(userId, ct), "Требуется вход", DomainErrorKind.Unauthenticated);

    private async Task<Project> RequireProjectAccessAsync(Guid projectId, User user, CancellationToken ct)
    {
        var project = Guard.Found(await _projects.FindByIdAsync(projectId, ct), "Проект не найден");
        Guard.Ensure(
            project.Members.Any(m => m.User.Id == user.Id),
            "Нет доступа к проекту",
            DomainErrorKind.Forbidden);
        return project;
    }

    private async Task<(Ticket Ticket, User Actor)> LoadAsync(Guid ticketId, Guid actorId, CancellationToken ct)
    {
        var actor = await RequireUserAsync(actorId, ct);
        var ticket = Guard.Found(await _tickets.FindByIdAsync(ticketId, ct), "Тикет не найден");
        Guard.Ensure(
            ticket.Project.Members.Any(m => m.User.Id == actor.Id),
            "Нет доступа к тикету",
            DomainErrorKind.Forbidden);
        return (ticket, actor);
    }

    private async Task<(Ticket Ticket, User Actor)> LoadManagedAsync(Guid ticketId, Guid actorId, CancellationToken ct)
    {
        var (ticket, actor) = await LoadAsync(ticketId, actorId, ct);
        Guard.Ensure(
            ticket.Project.Members.Any(m => m.User.Id == actor.Id && m.HasRole(Role.PROJECT_MANAGER)),
            "Требуется менеджер",
            DomainErrorKind.Forbidden);
        Guard.Ensure(ticket.Status != TicketStatus.ARCHIVED, "Архивный тикет неизменяем", DomainErrorKind.Conflict);
        return (ticket, actor);
    }
}
