using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Music.Core.Models;
using Music.Core.Services.Interfaces;

namespace Music.Api.Controllers;

[ApiController]
[Route("migrations")]
[Authorize(Policy = "RequireAdminRole")]
public sealed class MigrationsController(IMigrationService migrationService) : ControllerBase
{
    private readonly IMigrationService _migrationService = migrationService;

    [HttpPost("audio/missing-opus96")]
    [Produces("application/json")]
    [ProducesResponseType(typeof(Opus96BackfillResultModel), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> QueueMissingOpus96(CancellationToken cancellationToken)
    {
        Opus96BackfillResultModel result = await _migrationService
            .QueueMissingOpus96Async(cancellationToken);

        return Ok(result);
    }
}
