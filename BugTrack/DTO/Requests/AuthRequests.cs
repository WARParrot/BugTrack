using System.ComponentModel.DataAnnotations;
using BugTrack.Models;

namespace BugTrack.DTO.Requests;

public sealed record RegisterRequest
{
    [Required, StringLength(100)] public string FullName { get; init; } = "";
    [Required, StringLength(254)] public string Email { get; init; } = "";
    [Required, StringLength(128, MinimumLength = 8)] public string Password { get; init; } = "";
}

public sealed record LoginRequest
{
    [Required, StringLength(254)] public string Email { get; init; } = "";
    [Required, StringLength(128)] public string Password { get; init; } = "";
}
