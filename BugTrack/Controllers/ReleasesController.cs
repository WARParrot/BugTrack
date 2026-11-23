using BugTrack.DTO.Requests;
using BugTrack.DTO.Responses;
using BugTrack.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace BugTrack.Controllers;

[Route("api/releases")]
public sealed class ReleasesController : ApiControllerBase
{
    private readonly IReleaseService _releases;

    public ReleasesController(IReleaseService releases) => _releases = releases;

    [HttpGet]
    public async Task<ActionResult<ReleasesResponse>> List(CancellationToken ct) =>
        new ReleasesResponse(await _releases.ListAsync(ct));

    /// <summary>Administrators only.</summary>
    [HttpPost]
    public async Task<ActionResult<ReleaseResponse>> Create(CreateReleaseRequest request, CancellationToken ct)
    {
        var release = await _releases.CreateAsync(CurrentUserId, request.Version, request.ReleasedAt!.Value, ct);
        return StatusCode(StatusCodes.Status201Created, new ReleaseResponse(release));
    }
}
