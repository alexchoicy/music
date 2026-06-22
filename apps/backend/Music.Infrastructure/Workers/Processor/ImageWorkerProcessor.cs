using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Music.Core.Common.Exceptions;
using Music.Core.Entities;
using Music.Core.Services.Files.Enums;
using Music.Core.Workers;
using Music.Infrastructure.Data;

namespace Music.Infrastructure.Workers.Processor;

class ImageUploadWorkerProcessor(AppDbContext dbContext)
{
    public async Task ProcessAsync(
        ImageUploadProcessWorker job,
        CancellationToken cancellationToken
    )
    {
        FileObject sourceFileObject =
            await dbContext.FileObjects.FirstOrDefaultAsync(
                fileObject => fileObject.Id == job.FileObjectId,
                cancellationToken
            )
            ?? throw new EntityNotFoundException(
                $"File object with ID {job.FileObjectId} not found."
            );

        sourceFileObject.ProcessingStatus = FileProcessingStatus.Processing;
        await dbContext.SaveChangesAsync(cancellationToken);

        sourceFileObject.ProcessingStatus = FileProcessingStatus.Completed;
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
