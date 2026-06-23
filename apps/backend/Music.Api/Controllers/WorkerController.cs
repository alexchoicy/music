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
public sealed class WorkerController(IContentService contentService, AppDbContext dbContext)
    : ControllerBase
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
            await dbContext
                .FileObjects.FirstOrDefaultAsync(
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

    [HttpPost("images")]
    [ProducesResponseType(typeof(LoadImageWorkersResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> LoadImageWorkers(CancellationToken cancellationToken)
    {
        List<Guid> fileObjectIds = await dbContext
            .FileObjects.Where(fileObject =>
                fileObject.FileObjectVariant == FileObjectVariant.Original
                && fileObject.ProcessingStatus == FileProcessingStatus.Completed
                && fileObject.File != null
                && fileObject.File.Type == FileType.Image
                && (
                    fileObject.File.AlbumImages.Any()
                    || fileObject.File.PartyImages.Any()
                    || fileObject.File.ConcertImages.Any()
                )
            )
            .Select(fileObject => fileObject.Id)
            .ToListAsync(cancellationToken);

        foreach (Guid fileObjectId in fileObjectIds)
        {
            _ = contentService.RunBackgroundProcessUploadFileAsync(
                new ImageUploadProcessWorker { FileObjectId = fileObjectId },
                CancellationToken.None
            );
        }

        return Ok(new LoadImageWorkersResult { Count = fileObjectIds.Count });
    }
}

public sealed record RerunConcertWorkerRequest
{
    public required Guid ObjectId { get; init; }
}

public sealed record LoadImageWorkersResult
{
    public required int Count { get; init; }
}
