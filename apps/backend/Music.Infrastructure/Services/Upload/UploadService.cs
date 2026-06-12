using Microsoft.EntityFrameworkCore;
using Music.Core.Common.Exceptions;
using Music.Core.Entities;
using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;
using Music.Core.Services.Uploads;
using Music.Core.Services.Uploads.Requests;
using Music.Core.Services.Uploads.Results;
using Music.Core.Storage;
using Music.Core.Workers;
using Music.Infrastructure.Data;

namespace Music.Infrastructure.Services.Upload
{
    public class UploadService(AppDbContext dbContext, IContentService contentService)
        : IUploadService
    {
        private readonly AppDbContext _dbContext = dbContext;
        private readonly IContentService _contentService = contentService;

        public async Task<MultipartUploadResults> Init(
            CreateUploadRequest createUploadRequest,
            CancellationToken cancellationToken = default
        )
        {
            StoredFile? storedFile =
                await _dbContext
                    .StoredFiles.Include(f => f.FileObjects)
                    .FirstOrDefaultAsync(f => f.Id == createUploadRequest.FileId, cancellationToken)
                ?? throw new EntityNotFoundException("File not found");

            FileObject? originalFileObject =
                storedFile.FileObjects.FirstOrDefault(f =>
                    f.FileObjectVariant == FileObjectVariant.Original
                ) ?? throw new EntityNotFoundException("File object not found");

            return await _contentService.CreateMultipartUploadAsync(
                originalFileObject.StoragePath,
                originalFileObject.MimeType,
                originalFileObject.SizeInBytes,
                cancellationToken
            );
        }

        public async Task Complete(
            CompleteUploadRequest request,
            string userID,
            CancellationToken cancellationToken = default
        )
        {
            FileObject fileObject =
                await _dbContext
                    .FileObjects.Include(fo => fo.File!.TrackAudios)
                    .Include(fo => fo.File!.ConcertImages)
                    .Include(fo => fo.File!.ConcertFiles)
                    .FirstOrDefaultAsync(fo => fo.Id == request.FileObjectId, cancellationToken)
                ?? throw new EntityNotFoundException("File object not found");

            if (fileObject.FileObjectVariant != FileObjectVariant.Original)
                throw new ConflictException("Only original file object uploads can be completed");

            StoredFile storedFile =
                fileObject.File ?? throw new EntityNotFoundException("File not found");

            if (storedFile.UploadedByUserId != userID)
                throw new ConflictException(
                    "Stored file uploader does not match track audio uploader"
                );

            if (request.Multipart is not null)
            {
                await _contentService.CompleteMultipartUploadAsync(
                    fileObject.StoragePath,
                    request.Multipart.UploadId,
                    request.Multipart.Parts,
                    cancellationToken
                );
            }

            WorkerModel? workerModel = storedFile switch
            {
                { TrackAudios.Count: > 0 } => new TrackUploadProcessWorker
                {
                    FileObjectId = fileObject.Id,
                },
                { ConcertFiles.Count: > 0 } => new ConcertUploadProcessWorker
                {
                    FileObjectId = fileObject.Id,
                },
                _ => null,
            };

            if (workerModel is not null)
            {
                await _contentService.RunBackgroundProcessUploadFileAsync(
                    workerModel,
                    cancellationToken
                );
            }
        }
    }
}
