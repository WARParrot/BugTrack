using System.ComponentModel.DataAnnotations;
using BugTrack.Models;
using BugTrack.Models.Enums;

namespace BugTrack.DTO.Requests;

public sealed record CreateTicketRequest
{
    [Required, StringLength(200)] public string Title { get; init; } = "";
    [Required, StringLength(10000)] public string Description { get; init; } = "";
    [StringLength(10000)] public string StepsToReproduce { get; init; } = "";
    [Required] public TicketPriority? Priority { get; init; }
}

public sealed record AssignTicketRequest
{
    [Required] public Guid? UserId { get; init; }
}

/// <summary>Used by decline and reopen.</summary>
public sealed record ReasonRequest
{
    [Required, StringLength(2000)] public string Reason { get; init; } = "";
}

public sealed record SubmitFixRequest
{
    [Required, StringLength(2048)] public string Url { get; init; } = "";
}

public sealed record SetReleaseRequest
{
    [Required, StringLength(100)] public string Version { get; init; } = "";
}

public sealed record SetPriorityRequest
{
    [Required] public TicketPriority? Priority { get; init; }
}

public sealed record SetDeadlineRequest
{
    /// <summary>ISO-8601 with offset, e.g. 2030-01-01T12:00:00Z.</summary>
    [Required] public DateTimeOffset? Deadline { get; init; }
}

public sealed record AddCommentRequest
{
    [Required, StringLength(5000)] public string Text { get; init; } = "";
    public Guid? ParentId { get; init; }
}

public sealed record AddAttachmentRequest
{
    [Required] public AttachmentType? Type { get; init; }
    [Required, StringLength(2048)] public string Url { get; init; } = "";
}
