using System.Net.WebSockets;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Infrastructure.Services.WebSockets;

namespace Music.Api.Controllers;

[ApiController]
[Authorize]
[Route("ws")]
public class WsController(WebSocketService webSocketService) : ControllerBase
{
    [HttpGet]
    public async Task Get()
    {
        string? userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        if (!HttpContext.WebSockets.IsWebSocketRequest)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        using WebSocket webSocket = await HttpContext.WebSockets.AcceptWebSocketAsync();
        await webSocketService.HandleConnectionAsync(
            userId,
            webSocket,
            HttpContext.RequestAborted
        );
    }
}
