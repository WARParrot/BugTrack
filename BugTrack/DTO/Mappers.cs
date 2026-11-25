using BugTrack.DTO;
using BugTrack.Models;
using BugTrack.Models.Enums;

namespace BugTrack.DTO;

public static class Mappers
{
    public static UserDto ToDto(this User u) =>
        new(u.Id, u.FullName, u.Email.Value, u.IsAdmin, u.CreatedAt);

    public static MembershipDto ToDto(this Membership m) => new(m.Id, m.Role, m.User.ToDto());

    public static ProjectDto ToDto(this Project p) =>
        new(
            p.Id,
            p.Name,
            p.Description,
            p.CreatedAt,
            p.Repository is null ? null : new SourceRepositoryDto(p.Repository.Name, p.Repository.Url),
            p.Members.Select(m => m.ToDto()).ToList());

    public static ReleaseDto ToDto(this Release r) => new(r.Id, r.Version, r.ReleasedAt);

    public static AttachmentDto ToDto(this Attachment a) =>
        new(a.Id, a.Type, a.Url, a.UploadedBy.ToDto(), a.UploadedAt);

    public static CommentDto ToDto(this Comment c) =>
        new(
            c.Id,
            c.Author.ToDto(),
            c.Text,
            c.CreatedAt,
            c.Replies.OrderBy(r => r.CreatedAt).Select(r => r.ToDto()).ToList());

    public static TicketDto ToDto(this Ticket t) =>
        new(
            t.Id,
            t.Project.Id,
            t.Title,
            t.Description,
            t.StepsToReproduce,
            t.Status,
            t.Priority,
            t.Reporter.ToDto(),
            t.Assignee?.ToDto(),
            t.Deadline?.DueAt,
            t.Release?.ToDto(),
            t.MergeRequestUrl,
            t.CreatedAt,
            t.UpdatedAt,
            t.Comments.Where(c => c.Parent is null).OrderBy(c => c.CreatedAt).Select(c => c.ToDto()).ToList(),
            t.Attachments.OrderBy(a => a.UploadedAt).Select(a => a.ToDto()).ToList());

    public static TicketEventDto ToDto(this TicketEvent e) =>
        new(e.Id, e.Type, e.Actor.ToDto(), e.Note, e.OccurredAt);

    public static NotificationDto ToDto(this Notification n) =>
        new(n.Id, n.Message, n.IsRead, n.CreatedAt);
}
