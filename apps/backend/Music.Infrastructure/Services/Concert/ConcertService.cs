using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;
using Music.Core.Entities;
using Music.Core.Enums;
using Music.Core.Exceptions;
using Music.Core.Models;
using Music.Core.Services.Interfaces;
using Music.Core.Utils;
using Music.Infrastructure.Data;

namespace Music.Infrastructure.Services.Concert;

public sealed class ConcertService(
    AppDbContext dbContext,
    IContentService contentService,
    IAssetsService assetsService,
    ILogger<ConcertService> logger) : IConcertService
{
    private readonly AppDbContext _dbContext = dbContext;
    private readonly IContentService _contentService = contentService;
    private readonly ILogger<ConcertService> _logger = logger;
    private readonly IAssetsService _assetsService = assetsService;

    public async Task<CreateConcertUploadResult> CreateConcertAsync(
        CreateConcertModel concert,
        string userId,
        CancellationToken cancellationToken = default)
    {
        if (await ConcertExistsAsync(concert.Title, cancellationToken))
        {
            throw new ConflictException($"A concert with the title '{concert.Title}' already exists.");
        }

        if (await ConcertFileExistsAsync(concert.Files, cancellationToken))
        {
            throw new ConflictException("One or more files in the concert already exist in the system.");
        }

        await using IDbContextTransaction transaction = await _dbContext.Database
            .BeginTransactionAsync(cancellationToken);

        try
        {

            Core.Entities.Concert newConcert = new()
            {
                Title = concert.Title,
                Description = concert.Description,
                Date = concert.Date,
                CreatedByUserId = userId,
                CreatedAt = DateTimeOffset.UtcNow,
                ConcertAlbums =
                    concert.LinkedAlbumIds
                        .Distinct()
                        .Select(albumId => new ConcertAlbum
                        {
                            AlbumId = albumId
                        }).ToList()
                ,
                ConcertParties =
                    concert.LinkedParties
                        .GroupBy(party => new { party.PartyId, party.Role })
                        .Select(group => group.First())
                        .Select(party => new ConcertParty
                        {
                            PartyId = party.PartyId,
                            Role = party.Role
                        }).ToList()

            };

            List<ConcertFile> concertFiles = [];

            CreateConcertUploadResult uploadResult = new()
            {
                ConcertTitle = concert.Title
            };

            if (concert.Image is not null)
            {
                uploadResult.ConcertImage = await CreateConcertUploadImage(concert.Image, newConcert, userId, cancellationToken);
            }

            foreach (var file in concert.Files)
            {
                string path = _contentService.GetStoragePath(
                    MediaFolderOptions.OriginalVideo,
                    file.SimpleBlake3Hash,
                    file.MimeType,
                    file.OriginalFileName
                );

                string extension = Path.GetExtension(path).TrimStart('.');

                CreateFileModel createFileModel = new()
                {
                    OriginalFileName = file.OriginalFileName,
                    FileBlake3 = file.SimpleBlake3Hash,
                    MimeType = file.MimeType,
                    FileSizeInBytes = file.FileSizeInBytes,
                    Container = file.MimeType,
                    Extension = extension
                };

                (StoredFile storedFile, FileObject fileObject) = _contentService.CreateStoredFileWithObject(
                    createFileModel,
                    FileType.Video,
                    path,
                    FileObjectType.Original,
                    FileObjectVariant.Original,
                    userId);

                _dbContext.StoredFiles.Add(storedFile);
                _dbContext.FileObjects.Add(fileObject);

                ConcertFile concertFile = new()
                {
                    Title = file.Title,
                    Type = file.Type,
                    Order = file.Order,
                    File = storedFile,
                    Concert = newConcert
                };

                concertFiles.Add(concertFile);

                uploadResult.Files.Add(new CreateConcertUploadItemResult
                {
                    FileName = file.OriginalFileName,
                    FileObjectId = fileObject.Id,
                    SimpleBlake3Hash = file.SimpleBlake3Hash,
                    MultipartUploadInfo = await _contentService.CreateMultipartUploadAsync(path,
                        file.MimeType,
                        fileObject.SizeInBytes,
                        cancellationToken)
                });
            }

            newConcert.ConcertFiles = concertFiles;
            _dbContext.Concerts.Add(newConcert);
            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return uploadResult;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating concert {ConcertTitle}", concert.Title);
            await transaction.RollbackAsync(cancellationToken);
            _dbContext.ChangeTracker.Clear();
            throw;
        }
    }

    private async Task<CreateConcertUploadImageResult> CreateConcertUploadImage(CreateConcertImage concertImageModel, Core.Entities.Concert concert, string userId, CancellationToken cancellationToken)
    {
        string imagePath = _assetsService.GetStoragePath(
            MediaFolderOptions.AssetsCover,
            concertImageModel.File.FileBlake3,
            concertImageModel.File.MimeType,
            concertImageModel.File.OriginalFileName
        );

        (StoredFile? storedFile, FileObject? fileObject) = _assetsService.CreateStoredFileWithObject(concertImageModel.File,
            FileType.Image,
            imagePath,
            FileObjectType.Original,
            FileObjectVariant.Original,
            userId
            );

        _dbContext.StoredFiles.Add(storedFile);
        _dbContext.FileObjects.Add(fileObject);

        ConcertCover concertCover = new()
        {
            Concert = concert,
            File = storedFile,
        };

        _dbContext.Add(concertCover);

        return new CreateConcertUploadImageResult
        {
            Blake3Id = concertImageModel.File.FileBlake3,
            UploadUrl = _assetsService.CreateUploadUrlAsync(imagePath, fileObject.MimeType, cancellationToken)
        };
    }

    private async Task<bool> ConcertExistsAsync(string title, CancellationToken cancellationToken)
    {
        string normalizedInputTitle = StringUtils.NormalizeString(title);
        return await _dbContext.Concerts
            .AsNoTracking()
            .AnyAsync(c => c.NormalizedTitle == normalizedInputTitle, cancellationToken);
    }

    private async Task<bool> ConcertFileExistsAsync(IReadOnlyList<CreateConcertFileModel> files, CancellationToken cancellationToken)
    {
        if (files == null || files.Count == 0)
        {
            return false;
        }

        var fileHashes = files.Select(f => f.SimpleBlake3Hash).ToList();
        return await _dbContext.FileObjects
            .AsNoTracking()
            .AnyAsync(fobject => fileHashes.Contains(fobject.OriginalBlake3Hash), cancellationToken);
    }
}
