namespace BugTrack.DTO;

public sealed record ReleaseDto(Guid Id, string Version, DateOnly ReleasedAt);
