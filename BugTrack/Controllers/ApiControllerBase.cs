using BugTrack.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BugTrack.Controllers;

/// <summary>All endpoints require a valid session unless they opt out with [AllowAnonymous].</summary>
[ApiController]
[Authorize]
[Produces("application/json")]
public abstract class ApiControllerBase : ControllerBase
{
    /// <summary>Id of the signed-in user (never an entity — controllers only deal with ids and DTOs).</summary>
    protected Guid CurrentUserId => User.GetUserId();
}
