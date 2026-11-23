using BugTrack.Models;
using BugTrack.Models.Enums;

namespace BugTrack.DTO;

public sealed record MembershipDto(Guid Id, Role Role, UserDto User);

public sealed record SourceRepositoryDto(string Name, string Url);

public sealed record ProjectDto(
    Guid Id,
    string Name,
    string Description,
    DateTime CreatedAt,
    SourceRepositoryDto? Repository,
    IReadOnlyList<MembershipDto> Members);
