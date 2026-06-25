using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Music.Core.Common.Exceptions;
using Music.Core.Entities;
using Music.Core.Services.Files.Enums;
using Music.Core.Storage;
using Music.Core.Workers;
using Music.Infrastructure.Data;

namespace Music.Api.Controllers;

[ApiController]
[Authorize]
[Route("workers")]
public sealed class WorkerController(
    IContentService contentService,
    IBackgroundTaskQueue backgroundTaskQueue,
    AppDbContext dbContext
) : ControllerBase
{
    [HttpPost("concert")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RerunConcertWorker(
        [FromBody] RerunConcertWorkerRequest request,
        CancellationToken cancellationToken
    )
    {
        FileObject fileObject =
            await dbContext.FileObjects.FirstOrDefaultAsync(
                fo => fo.Id == request.ObjectId,
                cancellationToken
            )
            ?? throw new EntityNotFoundException(
                $"File object with ID {request.ObjectId} not found."
            );

        var worker = new ConcertUploadProcessWorker { FileObjectId = fileObject.Id };

        await contentService.RunBackgroundProcessUploadFileAsync(worker, cancellationToken);

        return Ok();
    }

    [HttpPost("party")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RerunPartyInfoEnrichmentWorker(
        [FromBody] RerunPartyInfoEnrichmentWorkerRequest request,
        CancellationToken cancellationToken
    )
    {
        bool partyExists = await dbContext.Parties.AnyAsync(
            party => party.Id == request.PartyId,
            cancellationToken
        );

        if (!partyExists)
        {
            throw new EntityNotFoundException($"Party with ID {request.PartyId} not found.");
        }

        await backgroundTaskQueue.QueueWorkerAsync(
            new PartyInfoEnrichmentWorker { PartyId = request.PartyId },
            cancellationToken
        );

        return Ok();
    }
}

public sealed record RerunConcertWorkerRequest
{
    public required Guid ObjectId { get; init; }
}

public sealed record RerunPartyInfoEnrichmentWorkerRequest
{
    public required int PartyId { get; init; }
}
