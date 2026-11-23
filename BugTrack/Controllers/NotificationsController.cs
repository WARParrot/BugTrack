using BugTrack.DTO.Responses;
using BugTrack.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace BugTrack.Controllers;

[Route("api/notifications")]
public sealed class NotificationsController : ApiControllerBase
{
    private readonly INotificationService _notifications;

    public NotificationsController(INotificationService notifications) => _notifications = notifications;

    /// <param name="unreadOnly">Optional filter; defaults to all notifications, newest first.</param>
    [HttpGet]
    public async Task<ActionResult<NotificationsResponse>> List([FromQuery] bool unreadOnly, CancellationToken ct) =>
        new NotificationsResponse(await _notifications.ListAsync(CurrentUserId, unreadOnly, ct));

    [HttpPost("{id}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id, CancellationToken ct)
    {
        await _notifications.MarkAsReadAsync(id, CurrentUserId, ct);
        return NoContent();
    }
}
