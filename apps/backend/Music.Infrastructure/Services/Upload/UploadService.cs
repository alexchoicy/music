using Microsoft.EntityFrameworkCore;
using Music.Core.Storage;
using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;
using Music.Core.Services.Uploads;
using Music.Core.Services.Uploads.Requests;
using Music.Core.Services.Uploads.Results;
using Music.Core.Entities;
using Music.Core.Common.Exceptions;
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
                    f.FileObjectVariant == FileObjectVariant.Original
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
