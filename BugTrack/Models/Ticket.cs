using BugTrack.Models.Enums;

namespace BugTrack.Models;

public class Ticket : Entity
{
    private readonly List<Comment> _comments = new();
    private readonly List<Attachment> _attachments = new();

    private Ticket() { }

    public Ticket(
        Project project,
        User reporter,
        string title,
        string description,
        TicketPriority priority,
        string stepsToReproduce = "")
    {
        Project = project ?? throw new ArgumentNullException(nameof(project));
        Reporter = reporter ?? throw new ArgumentNullException(nameof(reporter));
        Title = Guard.Text(title, "Название", 200);
        Description = Guard.Text(description, "Описание");
        Guard.DefinedEnum(priority, "Неизвестный приоритет");
        Priority = priority;
        StepsToReproduce = Guard.Text(stepsToReproduce, "Шаги", 10000, allowEmpty: true);
        Status = TicketStatus.OPEN;
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = CreatedAt;
    }

    public Project Project { get; private set; } = null!;
    public User Reporter { get; private set; } = null!;
    public User? Assignee { get; private set; }
    public string Title { get; private set; } = null!;
    public string Description { get; private set; } = null!;
    public string StepsToReproduce { get; private set; } = "";
    public TicketStatus Status { get; private set; }
    public TicketPriority Priority { get; private set; }
    public Deadline? Deadline { get; private set; }
    public Release? Release { get; private set; }
    public string? MergeRequestUrl { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    public int Revision { get; private set; }

    public IReadOnlyCollection<Comment> Comments => _comments;

    public IReadOnlyCollection<Attachment> Attachments => _attachments;

    public void Assign(User manager, User developer)
    {
        RequireRole(manager, Role.PROJECT_MANAGER);
        RequireRole(developer, Role.DEVELOPER);
        Guard.Ensure(
            Status is TicketStatus.OPEN or TicketStatus.REOPENED,
            "Назначение доступно до начала работы",
            DomainErrorKind.Conflict);
        Assignee = developer;
        Touch();
    }

    public void TakeOn(User developer)
    {
        RequireAssignedDeveloper(developer);
        Guard.Ensure(
            Status is TicketStatus.OPEN or TicketStatus.REOPENED,
            "Тикет нельзя взять в работу",
            DomainErrorKind.Conflict);
        Status = TicketStatus.IN_PROGRESS;
        Touch();
    }

    public void Decline(User developer, string reason)
    {
        RequireAssignedDeveloper(developer);
        Guard.Text(reason, "Причина отказа", 2000);
        Guard.Ensure(
            Status is TicketStatus.OPEN or TicketStatus.REOPENED or TicketStatus.IN_PROGRESS,
            "Нельзя отказаться от этого тикета",
            DomainErrorKind.Conflict);
        Status = TicketStatus.OPEN;
        Assignee = null;
        Touch();
    }

    public void SubmitFix(User developer, string mrUrl)
    {
        RequireAssignedDeveloper(developer);
        Guard.Ensure(
            Status == TicketStatus.IN_PROGRESS,
            "Сначала возьмите тикет в работу",
            DomainErrorKind.Conflict);
        var url = (mrUrl ?? string.Empty).Trim();
        Guard.Ensure(UrlRules.IsPlainHttp(url), "Укажите HTTP(S) URL Merge Request");
        MergeRequestUrl = url;
        Status = TicketStatus.READY_FOR_REVIEW;
        Touch();
    }

    public void Close(User tester)
    {
        RequireRole(tester, Role.TESTER);
        Guard.Ensure(
            Status == TicketStatus.READY_FOR_REVIEW,
            "Тикет не ожидает проверки",
            DomainErrorKind.Conflict);
        Status = TicketStatus.CLOSED;
        Touch();
    }

    public void Reopen(User tester, string reason)
    {
        RequireRole(tester, Role.TESTER);
        Guard.Text(reason, "Причина доработки", 2000);
        Guard.Ensure(
            Status == TicketStatus.READY_FOR_REVIEW,
            "Возврат доступен на проверке",
            DomainErrorKind.Conflict);
        Status = TicketStatus.REOPENED;
        Touch();
    }

    public void Archive(User manager)
    {
        RequireRole(manager, Role.PROJECT_MANAGER);
        Guard.Ensure(
            Status == TicketStatus.CLOSED,
            "Архивировать можно закрытый тикет",
            DomainErrorKind.Conflict);
        Status = TicketStatus.ARCHIVED;
        Touch();
    }

    public void SetRelease(Release release)
    {
        RequireNotArchived();
        Release = release ?? throw new ArgumentNullException(nameof(release));
        Touch();
    }

    public void SetDeadline(Deadline deadline)
    {
        RequireNotArchived();
        Deadline = deadline ?? throw new ArgumentNullException(nameof(deadline));
        Touch();
    }

    public void SetPriority(TicketPriority priority)
    {
        RequireNotArchived();
        Guard.DefinedEnum(priority, "Неизвестный приоритет");
        Priority = priority;
        Touch();
    }

    public Comment AddComment(User author, string text)
    {
        RequireNotArchived();
        RequireMember(author, "Нет доступа к обсуждению");
        var comment = new Comment(author, text);
        _comments.Add(comment);
        Touch();
        return comment;
    }

    public Comment AddReply(Guid parentId, User author, string text)
    {
        RequireNotArchived();
        RequireMember(author, "Нет доступа к обсуждению");
        var parent = _comments.FirstOrDefault(c => c.Id == parentId);
        Guard.Ensure(parent is not null, "Родительский комментарий не найден в тикете");
        var reply = parent.AddReply(author, text);
        _comments.Add(reply);
        Touch();
        return reply;
    }

    public Attachment AddAttachment(User uploader, AttachmentType type, string url)
    {
        RequireNotArchived();
        RequireMember(uploader, "Нет доступа к вложениям");
        var attachment = new Attachment(uploader, type, url);
        _attachments.Add(attachment);
        Touch();
        return attachment;
    }

    private void Touch()
    {
        UpdatedAt = DateTime.UtcNow;
        Revision++;
    }

    private void RequireNotArchived() =>
        Guard.Ensure(Status != TicketStatus.ARCHIVED, "Архивный тикет неизменяем", DomainErrorKind.Conflict);

    private void RequireMember(User user, string message) =>
        Guard.Ensure(Project.Members.Any(m => m.User.Id == user.Id), message, DomainErrorKind.Forbidden);

    private void RequireRole(User user, Role role) =>
        Guard.Ensure(
            Project.Members.Any(m => m.User.Id == user.Id && m.HasRole(role)),
            "Недостаточно прав для действия",
            DomainErrorKind.Forbidden);

    private void RequireAssignedDeveloper(User developer)
    {
        RequireRole(developer, Role.DEVELOPER);
        Guard.Ensure(
            Assignee?.Id == developer.Id,
            "Действие доступно назначенному разработчику",
            DomainErrorKind.Forbidden);
    }
}
