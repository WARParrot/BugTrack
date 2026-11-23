using BugTrack.DTO.Requests;
using BugTrack.DTO.Responses;
using BugTrack.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace BugTrack.Controllers;

[Route("api/projects")]
public sealed class ProjectsController : ApiControllerBase
{
    private readonly IProjectService _projects;

    public ProjectsController(IProjectService projects) => _projects = projects;

    [HttpGet]
    public async Task<ActionResult<ProjectsResponse>> List(CancellationToken ct) =>
        new ProjectsResponse(await _projects.ListAsync(CurrentUserId, ct));

    [HttpPost]
    public async Task<ActionResult<ProjectResponse>> Create(CreateProjectRequest request, CancellationToken ct)
    {
        var project = await _projects.CreateProjectAsync(CurrentUserId, request.Name, request.Description, ct);
        return StatusCode(StatusCodes.Status201Created, new ProjectResponse(project));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProjectResponse>> Get(Guid id, CancellationToken ct) =>
        new ProjectResponse(await _projects.GetAsync(id, CurrentUserId, ct));

    [HttpPost("{id}/members")]
    public async Task<ActionResult<ProjectResponse>> AddMember(Guid id, AddMemberRequest request, CancellationToken ct)
    {
        var project = await _projects.AddMemberAsync(id, CurrentUserId, request.Email, request.Role!.Value, ct);
        return StatusCode(StatusCodes.Status201Created, new ProjectResponse(project));
    }

    [HttpPatch("{id}/members/{userId}")]
    public async Task<ActionResult<ProjectResponse>> ChangeMemberRole(
        Guid id, Guid userId, ChangeMemberRoleRequest request, CancellationToken ct) =>
        new ProjectResponse(await _projects.ChangeMemberRoleAsync(id, CurrentUserId, userId, request.Role!.Value, ct));

    [HttpDelete("{id}/members/{userId}")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid userId, CancellationToken ct)
    {
        await _projects.RemoveMemberAsync(id, CurrentUserId, userId, ct);
        return NoContent();
    }

    [HttpPut("{id}/repository")]
    public async Task<ActionResult<ProjectResponse>> LinkRepository(
        Guid id, LinkRepositoryRequest request, CancellationToken ct) =>
        new ProjectResponse(await _projects.LinkRepositoryAsync(id, CurrentUserId, request.Name, request.Url, ct));
}
