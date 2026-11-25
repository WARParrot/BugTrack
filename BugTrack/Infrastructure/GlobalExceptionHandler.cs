using BugTrack.DTO.Responses;
using BugTrack.Models;
using Microsoft.AspNetCore.Diagnostics;

namespace BugTrack.Infrastructure;

public sealed class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) => _logger = logger;

    public async ValueTask<bool> TryHandleAsync(HttpContext http, Exception exception, CancellationToken ct)
    {
        var (status, message) = exception switch
        {
            DomainException d => (ToStatusCode(d.Kind), d.Message),
            BadHttpRequestException b => (b.StatusCode, "Некорректный запрос"),
            _ => (StatusCodes.Status500InternalServerError, "Внутренняя ошибка сервера"),
        };

        if (status >= 500)
            _logger.LogError(exception, "Unhandled exception for {Method} {Path}", http.Request.Method, http.Request.Path);

        http.Response.StatusCode = status;
        await http.Response.WriteAsJsonAsync(new ErrorResponse(message), ct);
        return true;
    }

    private static int ToStatusCode(DomainErrorKind kind) => kind switch
    {
        DomainErrorKind.Validation => StatusCodes.Status400BadRequest,
        DomainErrorKind.Unauthenticated => StatusCodes.Status401Unauthorized,
        DomainErrorKind.Forbidden => StatusCodes.Status403Forbidden,
        DomainErrorKind.NotFound => StatusCodes.Status404NotFound,
        DomainErrorKind.Conflict => StatusCodes.Status409Conflict,
        _ => StatusCodes.Status500InternalServerError,
    };
}
