using BugTrack.DTO.Requests;
using BugTrack.DTO.Responses;
using BugTrack.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace BugTrack.Controllers;

[Route("api")]
public sealed class TicketsController : ApiControllerBase
{
    private readonly ITicketService _tickets;

    public TicketsController(ITicketService tickets) => _tickets = tickets;

    [HttpGet("projects/{projectId}/tickets")]
    public async Task<ActionResult<TicketsResponse>> List(Guid projectId, CancellationToken ct) =>
        new TicketsResponse(await _tickets.ListAsync(projectId, CurrentUserId, ct));

    [HttpPost("projects/{projectId}/tickets")]
    public async Task<ActionResult<TicketResponse>> Create(Guid projectId, CreateTicketRequest request, CancellationToken ct)
    {
        var ticket = await _tickets.CreateTicketAsync(
            projectId, CurrentUserId, request.Title, request.Description,
            request.Priority!.Value, request.StepsToReproduce, ct);
        return StatusCode(StatusCodes.Status201Created, new TicketResponse(ticket));
    }

    [HttpGet("tickets/{id}")]
    public async Task<ActionResult<TicketResponse>> Get(Guid id, CancellationToken ct) =>
        new TicketResponse(await _tickets.GetAsync(id, CurrentUserId, ct));

    [HttpGet("tickets/{id}/events")]
    public async Task<ActionResult<TicketEventsResponse>> History(Guid id, CancellationToken ct) =>
        new TicketEventsResponse(await _tickets.HistoryAsync(id, CurrentUserId, ct));

    [HttpPost("tickets/{id}/assign")]
    public async Task<ActionResult<TicketResponse>> Assign(Guid id, AssignTicketRequest request, CancellationToken ct) =>
        new TicketResponse(await _tickets.AssignTicketAsync(id, CurrentUserId, request.UserId!.Value, ct));

    [HttpPost("tickets/{id}/take")]
    public async Task<ActionResult<TicketResponse>> Take(Guid id, CancellationToken ct) =>
        new TicketResponse(await _tickets.TakeOnAsync(id, CurrentUserId, ct));

    [HttpPost("tickets/{id}/decline")]
    public async Task<ActionResult<TicketResponse>> Decline(Guid id, ReasonRequest request, CancellationToken ct) =>
        new TicketResponse(await _tickets.DeclineTicketAsync(id, CurrentUserId, request.Reason, ct));

    [HttpPost("tickets/{id}/submit-fix")]
    public async Task<ActionResult<TicketResponse>> SubmitFix(Guid id, SubmitFixRequest request, CancellationToken ct) =>
        new TicketResponse(await _tickets.SubmitFixAsync(id, CurrentUserId, request.Url, ct));

    [HttpPost("tickets/{id}/close")]
    public async Task<ActionResult<TicketResponse>> Close(Guid id, CancellationToken ct) =>
        new TicketResponse(await _tickets.VerifyAndCloseAsync(id, CurrentUserId, ct));

    [HttpPost("tickets/{id}/reopen")]
    public async Task<ActionResult<TicketResponse>> Reopen(Guid id, ReasonRequest request, CancellationToken ct) =>
        new TicketResponse(await _tickets.RequestReworkAsync(id, CurrentUserId, request.Reason, ct));

    [HttpPost("tickets/{id}/archive")]
    public async Task<ActionResult<TicketResponse>> Archive(Guid id, CancellationToken ct) =>
        new TicketResponse(await _tickets.ArchiveAsync(id, CurrentUserId, ct));

    [HttpPut("tickets/{id}/release")]
    public async Task<ActionResult<TicketResponse>> SetRelease(Guid id, SetReleaseRequest request, CancellationToken ct) =>
        new TicketResponse(await _tickets.SetReleaseAsync(id, CurrentUserId, request.Version, ct));

    [HttpPut("tickets/{id}/priority")]
    public async Task<ActionResult<TicketResponse>> SetPriority(Guid id, SetPriorityRequest request, CancellationToken ct) =>
        new TicketResponse(await _tickets.SetPriorityAsync(id, CurrentUserId, request.Priority!.Value, ct));

    [HttpPut("tickets/{id}/deadline")]
    public async Task<ActionResult<TicketResponse>> SetDeadline(Guid id, SetDeadlineRequest request, CancellationToken ct) =>
        new TicketResponse(await _tickets.SetDeadlineAsync(id, CurrentUserId, request.Deadline!.Value, ct));

    [HttpPost("tickets/{id}/comments")]
    public async Task<ActionResult<CommentResponse>> AddComment(Guid id, AddCommentRequest request, CancellationToken ct)
    {
        var comment = await _tickets.AddCommentAsync(id, CurrentUserId, request.Text, request.ParentId, ct);
        return StatusCode(StatusCodes.Status201Created, new CommentResponse(comment));
    }

    [HttpPost("tickets/{id}/attachments")]
    public async Task<ActionResult<AttachmentResponse>> AddAttachment(Guid id, AddAttachmentRequest request, CancellationToken ct)
    {
        var attachment = await _tickets.AddAttachmentAsync(id, CurrentUserId, request.Type!.Value, request.Url, ct);
        return StatusCode(StatusCodes.Status201Created, new AttachmentResponse(attachment));
    }
}
