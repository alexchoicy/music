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
                    .FirstOrDefaultAsync(
                        f => f.Id == createUploadRequest.FileObjectId,
                        cancellationToken
                    )
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

        public async Task<IReadOnlyList<PendingOriginalFileResult>> GetPendingOriginalFiles(
            string userID,
            CancellationToken cancellationToken = default
        ) =>
            await _dbContext
                .FileObjects.AsNoTracking()
                .Where(fo =>
                    fo.File != null
                    && fo.File.UploadedByUserId == userID
                    && fo.FileObjectVariant == FileObjectVariant.Original
                    && fo.ProcessingStatus == FileProcessingStatus.Pending
                )
                .OrderByDescending(fo => fo.CreatedAt)
                .Select(fo => new PendingOriginalFileResult
                {
                    FileId = fo.FileId,
                    FileObjectId = fo.Id,
                    FileName = fo.File!.OriginalFileName,
                    Blake3Hash = fo.File.OriginalBlake3Hash,
                    ProcessingStatus = fo.ProcessingStatus,
                    CreatedAt = fo.CreatedAt,
                })
                .ToListAsync(cancellationToken);

        public async Task<StartUploadResult> Start(
            Guid fileObjectID,
            string userID,
            CancellationToken cancellationToken = default
        )
        {
            FileObject fileObject =
                await _dbContext
                    .FileObjects.Include(fo => fo.File)
                    .FirstOrDefaultAsync(fo => fo.Id == fileObjectID, cancellationToken)
                ?? throw new EntityNotFoundException("File object not found");

            if (fileObject.FileObjectVariant != FileObjectVariant.Original)
                throw new ConflictException("Only original file object uploads can be started");

            if (fileObject.ProcessingStatus != FileProcessingStatus.Pending)
                throw new ConflictException("Only pending file object uploads can be started");

            StoredFile storedFile =
                fileObject.File ?? throw new EntityNotFoundException("File not found");

            if (storedFile.UploadedByUserId != userID)
                throw new ConflictException("Stored file uploader does not match current user");

            MultipartUploadResults multipartUpload =
                await _contentService.CreateMultipartUploadAsync(
                    fileObject.StoragePath,
                    fileObject.MimeType,
                    fileObject.SizeInBytes,
                    cancellationToken
                );

            PendingOriginalFileResult pendingFile = new()
            {
                FileId = fileObject.FileId,
                FileObjectId = fileObject.Id,
                FileName = storedFile.OriginalFileName,
                Blake3Hash = storedFile.OriginalBlake3Hash,
                ProcessingStatus = fileObject.ProcessingStatus,
                CreatedAt = fileObject.CreatedAt,
            };

            return new StartUploadResult
            {
                Blake3Hash = storedFile.OriginalBlake3Hash,
                FileObject = pendingFile,
                MultipartUpload = multipartUpload,
            };
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
                    .Include(fo => fo.File!.AlbumImages)
                    .Include(fo => fo.File!.PartyImages)
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

            fileObject.ProcessingStatus = FileProcessingStatus.Uploaded;
            await _dbContext.SaveChangesAsync(cancellationToken);

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
                { AlbumImages.Count: > 0 }
                or { PartyImages.Count: > 0 }
                or { ConcertImages.Count: > 0 } => new ImageUploadProcessWorker
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
