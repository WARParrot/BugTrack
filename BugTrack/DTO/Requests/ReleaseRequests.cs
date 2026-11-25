using System.ComponentModel.DataAnnotations;

namespace BugTrack.DTO.Requests;

public sealed record CreateReleaseRequest
{
    [Required, StringLength(100)] public string Version { get; init; } = "";

    [Required] public DateOnly? ReleasedAt { get; init; }
}
