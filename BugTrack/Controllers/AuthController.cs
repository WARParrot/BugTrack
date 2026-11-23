using BugTrack.DTO.Requests;
using BugTrack.DTO.Responses;
using BugTrack.Infrastructure;
using BugTrack.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BugTrack.Controllers;

[Route("api/auth")]
public sealed class AuthController : ApiControllerBase
{
    private readonly IAuthenticationService _auth;

    public AuthController(IAuthenticationService auth) => _auth = auth;

    [HttpPost("register"), AllowAnonymous]
    public async Task<ActionResult<UserResponse>> Register(RegisterRequest request, CancellationToken ct)
    {
        var result = await _auth.RegisterAsync(request.FullName, request.Email, request.Password, ct);
        await SessionCookie.SignInAsync(HttpContext, result);
        return StatusCode(StatusCodes.Status201Created, new UserResponse(result.User));
    }

    [HttpPost("login"), AllowAnonymous]
    public async Task<ActionResult<UserResponse>> Login(LoginRequest request, CancellationToken ct)
    {
        var result = await _auth.AuthenticateAsync(request.Email, request.Password, ct);
        await SessionCookie.SignInAsync(HttpContext, result);
        return new UserResponse(result.User);
    }

    [HttpGet("me")]
    public async Task<ActionResult<UserResponse>> Me(CancellationToken ct) =>
        new UserResponse(await _auth.GetUserAsync(CurrentUserId, ct));

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        await _auth.LogoutAsync(CurrentUserId, ct);
        await SessionCookie.SignOutAsync(HttpContext);
        return NoContent();
    }
}
