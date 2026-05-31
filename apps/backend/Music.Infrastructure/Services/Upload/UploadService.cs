using Microsoft.EntityFrameworkCore;
using Music.Core.Application.Storage;
using Music.Core.Domain.Uploads.Requests;
using Music.Core.Domain.Uploads;
using Music.Core.Entities;
using Music.Core.Shared.Exceptions;
using Music.Infrastructure.Data;

namespace Music.Infrastructure.Services.Upload
{
    public class UploadService(AppDbContext dbContext, IContentService contentService) : IUploadService
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
                        f => f.Id == createUploadRequest.FileId,
                        cancellationToken
                    )
                ?? throw new EntityNotFoundException("File not found");

            FileObject? originalFileObject =
                storedFile.FileObjects.FirstOrDefault(f =>
                    f.FileObjectVariant == Core.Domain.Files.Enums.FileObjectVariant.Original
                    && f.Type == Core.Domain.Files.Enums.FileObjectType.Original
                ) ?? throw new EntityNotFoundException("File object not found");

            return await _contentService.CreateMultipartUploadAsync(
                originalFileObject.StoragePath,
                originalFileObject.MimeType,
                originalFileObject.SizeInBytes,
                cancellationToken
            );
        }

        public Task Complete(
            CompleteUploadRequest request,
            CancellationToken cancellationToken = default
        )
        {
            throw new NotImplementedException();
        }
    }
}
