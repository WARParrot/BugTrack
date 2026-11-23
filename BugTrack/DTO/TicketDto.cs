using BugTrack.Models;
using BugTrack.Models.Enums;

namespace BugTrack.DTO;

public sealed record AttachmentDto(Guid Id, AttachmentType Type, string Url, UserDto Uploader, DateTime UploadedAt);

public sealed record CommentDto(
    Guid Id,
    UserDto Author,
    string Text,
    DateTime CreatedAt,
    IReadOnlyList<CommentDto> Replies);

public sealed record TicketDto(
    Guid Id,
    Guid ProjectId,
    string Title,
    string Description,
    string StepsToReproduce,
    TicketStatus Status,
    TicketPriority Priority,
    UserDto Reporter,
    UserDto? Assignee,
    DateTime? Deadline,
    ReleaseDto? Release,
    string? MergeRequestUrl,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<CommentDto> Comments,
    IReadOnlyList<AttachmentDto> Attachments);

public sealed record TicketEventDto(Guid Id, TicketEventType Type, UserDto Actor, string? Note, DateTime OccurredAt);
