using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;
using Music.Core.Common.Exceptions;
using Music.Core.Common.Utils;
using Music.Core.Entities;
using Music.Core.Options;
using Music.Core.Services.Concerts;
using Music.Core.Services.Concerts.Requests;
using Music.Core.Services.Concerts.Results;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;
using Music.Core.Storage;
using Music.Infrastructure.Data;
using Music.Infrastructure.Mappers;

namespace Music.Infrastructure.Services.Concert;

public class ConcertService(
    AppDbContext dbContext,
    IContentService contentService,
    IAssetsService assetsService,
    ILogger<ConcertService> logger
) : IConcertService
{
    private async Task<bool> ConcertExistsAsync(string title, CancellationToken cancellationToken)
    {
        string normalizedInputTitle = StringUtils.NormalizeString(title);
        return await dbContext
            .Concerts.AsNoTracking()
            .AnyAsync(c => c.NormalizedTitle == normalizedInputTitle, cancellationToken);
    }

    private async Task<bool> ConcertFileExistsAsync(
        IReadOnlyList<ConcertFileRequest> files,
        CancellationToken cancellationToken
    )
    {
        if (files == null || files.Count == 0)
        {
            return false;
        }

        var fileHashes = files.Select(f => f.SimpleBlake3Hash).ToList();
        return await dbContext
            .FileObjects.AsNoTracking()
            .AnyAsync(fobject => fileHashes.Contains(fobject.ObjectBlake3Hash), cancellationToken);
    }

    public async Task<CreateConcertUploadResult> CreateConcertAsync(
        CreateConcertRequest concert,
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        if (await ConcertExistsAsync(concert.Title, cancellationToken))
        {
            throw new ConflictException(
                $"A concert with the title '{concert.Title}' already exists."
            );
        }

        if (await ConcertFileExistsAsync(concert.Files, cancellationToken))
        {
            throw new ConflictException(
                "One or more files in the concert already exist in the system."
            );
        }

        await using IDbContextTransaction transaction =
            await dbContext.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            Core.Entities.Concert newConcert = new()
            {
                Title = concert.Title,
                Description = concert.Description,
                Date = concert.Date,
                CreatedByUserId = userId,
                CreatedAt = DateTimeOffset.UtcNow,
                ConcertAlbums = concert
                    .LinkedAlbumIds.Distinct()
                    .Select(albumId => new ConcertAlbum { AlbumId = albumId })
                    .ToList(),
                ConcertParties = concert
                    .LinkedParties.GroupBy(party => new { party.PartyId, party.Role })
                    .Select(group => group.First())
                    .Select(party => new ConcertParty
                    {
                        PartyId = party.PartyId,
                        Role = party.Role,
                    })
                    .ToList(),
            };

            List<ConcertFile> concertFiles = [];

            CreateConcertUploadResult uploadResult = new()
            {
                ConcertTitle = concert.Title,
                ConcertImage = concert.Image is null
                    ? null
                    : CreateConcertUploadImage(
                        concert.Image,
                        newConcert,
                        userId,
                        cancellationToken
                    ),
            };

            foreach (var file in concert.Files)
            {
                string path = contentService.GetStoragePath(
                    MediaFolderOptions.OriginalVideo,
                    file.SimpleBlake3Hash,
                    file.MimeType,
                    file.OriginalFileName
                );

                string extension = Path.GetExtension(path).TrimStart('.');

                FileRequest fileRequest = new()
                {
                    OriginalFileName = file.OriginalFileName,
                    Blake3Hash = file.SimpleBlake3Hash,
                    MimeType = file.MimeType,
                    SizeInBytes = file.SizeInBytes,
                    Container = file.MimeType,
                    Extension = extension,
                };

                (StoredFile storedFile, FileObject fileObject) =
                    contentService.CreateStoredFileWithObject(
                        fileRequest,
                        FileType.Video,
                        path,
                        StorageArea.Content,
                        FileObjectVariant.Original,
                        userId,
                        file.Source,
                        file.SourceUrl
                    );

                dbContext.StoredFiles.Add(storedFile);
                dbContext.FileObjects.Add(fileObject);

                ConcertFile concertFile = new()
                {
                    Title = file.Title,
                    Type = file.Type,
                    Order = file.Order,
                    File = storedFile,
                    Concert = newConcert,
                };

                concertFiles.Add(concertFile);

                uploadResult.Files.Add(
                    new CreateConcertUploadItemResult
                    {
                        FileName = file.OriginalFileName,
                        FileObjectId = fileObject.Id,
                        SimpleBlake3Hash = file.SimpleBlake3Hash,
                        MultipartUploadInfo = await contentService.CreateMultipartUploadAsync(
                            path,
                            file.MimeType,
                            fileObject.SizeInBytes,
                            cancellationToken
                        ),
                    }
                );
            }

            newConcert.ConcertFiles = concertFiles;
            dbContext.Concerts.Add(newConcert);
            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return uploadResult;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error creating concert {ConcertTitle}", concert.Title);
            await transaction.RollbackAsync(cancellationToken);
            dbContext.ChangeTracker.Clear();
            throw;
        }
    }

    private CreateConcertUploadImageResult CreateConcertUploadImage(
        ConcertImageRequest concertImageModel,
        Core.Entities.Concert concert,
        string userId,
        CancellationToken cancellationToken
    )
    {
        string imagePath = assetsService.GetStoragePath(
            MediaFolderOptions.AssetsCover,
            concertImageModel.File.Blake3Hash,
            concertImageModel.File.MimeType,
            concertImageModel.File.OriginalFileName
        );

        (StoredFile storedFile, FileObject fileObject) =
            assetsService.CreateStoredFileWithObject(
                concertImageModel.File,
                FileType.Image,
                imagePath,
                StorageArea.Assets,
                FileObjectVariant.Original,
                userId
            );

        dbContext.StoredFiles.Add(storedFile);
        dbContext.FileObjects.Add(fileObject);

        ConcertImage concertImage = new()
        {
            Concert = concert,
            File = storedFile,
            IsPrimary = true,
            CropHeight = concertImageModel.CroppedArea?.Height,
            CropWidth = concertImageModel.CroppedArea?.Width,
            CropX = concertImageModel.CroppedArea?.X,
            CropY = concertImageModel.CroppedArea?.Y,
        };

        dbContext.ConcertImages.Add(concertImage);

        return new CreateConcertUploadImageResult
        {
            Blake3Hash = concertImageModel.File.Blake3Hash,
            UploadUrl = assetsService.CreateUploadUrlAsync(
                imagePath,
                fileObject.MimeType,
                cancellationToken
            ),
        };
    }

    public Task<CreateConcertWithoutUploadResult> CreateConcertWithoutUploadAsync(
        CreateConcertRequest concert,
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        throw new NotImplementedException();
    }

    public async Task<IReadOnlyList<ConcertListItem>> GetAllAsync(
        CancellationToken cancellationToken = default
    )
    {
        List<Core.Entities.Concert> concerts = await dbContext
            .Concerts.AsNoTracking()
            .AsSplitQuery()
            .Include(concert => concert.Images)
                .ThenInclude(image => image.File)
                    .ThenInclude(file => file!.FileObjects)
            .Include(concert => concert.ConcertParties)
                .ThenInclude(concertParty => concertParty.Party)
            .Include(concert => concert.ConcertAlbums)
            .Include(concert => concert.ConcertFiles)
                .ThenInclude(concertFile => concertFile.File)
                    .ThenInclude(file => file!.FileObjects)
            .OrderByDescending(concert => concert.CreatedAt)
            .ToListAsync(cancellationToken);

        return concerts.Select(concert => concert.ToListItem(assetsService)).ToList();
    }

    public async Task<ConcertDetails> GetByIdAsync(
        int concertId,
        CancellationToken cancellationToken = default
    )
    {
        Core.Entities.Concert? concert = await dbContext
            .Concerts.AsNoTracking()
            .AsSplitQuery()
            .Include(concert => concert.Images)
                .ThenInclude(image => image.File)
                    .ThenInclude(file => file!.FileObjects)
            .Include(concert => concert.ConcertParties)
                .ThenInclude(concertParty => concertParty.Party)
            .Include(concert => concert.ConcertFiles)
                .ThenInclude(concertFile => concertFile.File)
                    .ThenInclude(file => file!.FileObjects)
            .Include(concert => concert.ConcertAlbums)
                .ThenInclude(concertAlbum => concertAlbum.Album)
                    .ThenInclude(album => album!.Credits)
                        .ThenInclude(credit => credit.Party)
            .Include(concert => concert.ConcertAlbums)
                .ThenInclude(concertAlbum => concertAlbum.Album)
                    .ThenInclude(album => album!.Discs)
                        .ThenInclude(disc => disc.Tracks)
                            .ThenInclude(albumTrack => albumTrack.Track)
            .Include(concert => concert.ConcertAlbums)
                .ThenInclude(concertAlbum => concertAlbum.Album)
                    .ThenInclude(album => album!.Images)
                        .ThenInclude(image => image.File)
                            .ThenInclude(file => file!.FileObjects)
            .FirstOrDefaultAsync(concert => concert.Id == concertId, cancellationToken);

        if (concert is null)
            throw new EntityNotFoundException($"Concert {concertId} not found");

        return concert.ToDetails(contentService, assetsService);
    }
}
