using BugTrack.DTO.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BugTrack.Controllers;

[Route("api/health")]
public sealed class HealthController : ApiControllerBase
{
    [HttpGet, AllowAnonymous]
    public ActionResult<HealthResponse> Get() => new HealthResponse(true);
}
