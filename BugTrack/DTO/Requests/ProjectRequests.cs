using System.ComponentModel.DataAnnotations;
using BugTrack.Models;
using BugTrack.Models.Enums;

namespace BugTrack.DTO.Requests;

public sealed record CreateProjectRequest
{
    [Required, StringLength(150)] public string Name { get; init; } = "";
    [StringLength(10000)] public string Description { get; init; } = "";
}

public sealed record AddMemberRequest
{
    [Required, StringLength(254)] public string Email { get; init; } = "";
    [Required] public Role? Role { get; init; }
}

public sealed record ChangeMemberRoleRequest
{
    [Required] public Role? Role { get; init; }
}

public sealed record LinkRepositoryRequest
{
    [Required, StringLength(150)] public string Name { get; init; } = "";
    [Required, StringLength(2048)] public string Url { get; init; } = "";
}
