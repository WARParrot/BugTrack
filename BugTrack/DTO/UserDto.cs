using BugTrack.Models;

namespace BugTrack.DTO;

public sealed record UserDto(Guid Id, string FullName, string Email, bool IsAdmin, DateTime CreatedAt);

public sealed record AuthenticationResult(UserDto User, int SessionVersion);
