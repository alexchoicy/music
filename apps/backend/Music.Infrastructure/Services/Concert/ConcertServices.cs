using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Music.Core.Common.Enums;
using Music.Core.Common.Exceptions;
using Music.Core.Common.Utils;
using Music.Core.Entities;
using Music.Core.Options;
using Music.Core.Services.Albums;
using Music.Core.Services.Concerts;
using Music.Core.Services.Concerts.Enums;
using Music.Core.Services.Concerts.Requests;
using Music.Core.Services.Concerts.Results;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;
using Music.Core.Services.Subtitles;
using Music.Core.Storage;
using Music.Core.Workers;
using Music.Infrastructure.Data;
using Music.Infrastructure.Mappers;
using Music.Infrastructure.Services.Sharing;

namespace Music.Infrastructure.Services.Concert;

public class ConcertService(
    AppDbContext dbContext,
    IContentService contentService,
    IAssetsService assetsService,
    ISubtitleService subtitleService,
    IOptions<BaseOptions> baseOptions,
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

            (CreateConcertUploadImageResult? imageUpload, FileObject? imageToReprocess) =
                concert.Image is null
                    ? (null, null)
                    : await CreateConcertImageAsync(
                        concert.Image,
                        newConcert,
                        userId,
                        cancellationToken
                    );

            CreateConcertUploadResult uploadResult = new()
            {
                ConcertTitle = concert.Title,
                ConcertImage = imageUpload,
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

            if (imageToReprocess is not null)
                await assetsService.RunBackgroundProcessUploadFileAsync(
                    new ImageUploadProcessWorker { FileObjectId = imageToReprocess.Id },
                    cancellationToken
                );

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

    private async Task<(
        CreateConcertUploadImageResult? Upload,
        FileObject? Reprocess
    )> CreateConcertImageAsync(
        ConcertImageRequest concertImageModel,
        Core.Entities.Concert concert,
        string userId,
        CancellationToken cancellationToken
    )
    {
        StoredFile? storedFile = await dbContext
            .StoredFiles.Include(file => file.FileObjects)
            .FirstOrDefaultAsync(
                file => file.OriginalBlake3Hash == concertImageModel.File.Blake3Hash,
                cancellationToken
            );

        FileObject? uploadTarget = null;
        FileObject? reprocess = null;

        if (storedFile is null)
        {
            string imagePath = assetsService.GetStoragePath(
                MediaFolderOptions.AssetsCover,
                concertImageModel.File.Blake3Hash,
                concertImageModel.File.MimeType,
                concertImageModel.File.OriginalFileName
            );

            (storedFile, uploadTarget) = assetsService.CreateStoredFileWithObject(
                concertImageModel.File,
                FileType.Image,
                imagePath,
                StorageArea.Assets,
                FileObjectVariant.Original,
                userId
            );

            dbContext.StoredFiles.Add(storedFile);
            dbContext.FileObjects.Add(uploadTarget);
        }
        else
        {
            FileObject? original = storedFile.FileObjects.FirstOrDefault(fileObject =>
                fileObject.FileObjectVariant == FileObjectVariant.Original
            );

            if (
                original is { ProcessingStatus: FileProcessingStatus.Pending }
                && storedFile.UploadedByUserId == userId
            )
            {
                uploadTarget = original;
            }
            else if (
                original is
                { ProcessingStatus: FileProcessingStatus.Completed or FileProcessingStatus.Failed }
            )
            {
                original.ProcessingStatus = FileProcessingStatus.Uploaded;
                reprocess = original;
            }
        }

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

        CreateConcertUploadImageResult? upload = uploadTarget is null
            ? null
            : new CreateConcertUploadImageResult
            {
                FileObjectId = uploadTarget.Id,
                Blake3Hash = concertImageModel.File.Blake3Hash,
                UploadUrl = assetsService.CreateUploadUrlAsync(
                    uploadTarget.StoragePath,
                    uploadTarget.MimeType,
                    cancellationToken
                ),
            };

        return (upload, reprocess);
    }

    public Task<CreateConcertWithoutUploadResult> CreateConcertWithoutUploadAsync(
        CreateConcertRequest concert,
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        throw new NotImplementedException();
    }

    public Task<int> CountAsync(
        ConcertListRequest request,
        CancellationToken cancellationToken = default
    )
    {
        return FilterListQuery(request).CountAsync(cancellationToken);
    }

    private IQueryable<Core.Entities.Concert> FilterListQuery(ConcertListRequest request)
    {
        IQueryable<Core.Entities.Concert> query = dbContext.Concerts.AsNoTracking();

        string normalizedSearch = StringUtils.NormalizeString(request.Search ?? string.Empty);
        string searchPattern = $"%{normalizedSearch}%";

        if (normalizedSearch.Length > 0)
        {
            query = query.Where(concert =>
                EF.Functions.Like(
                    AppDbContext.ImmutableUnaccent(concert.NormalizedTitle),
                    AppDbContext.ImmutableUnaccent(searchPattern)
                )
                || EF.Functions.TrigramsAreSimilar(
                    AppDbContext.ImmutableUnaccent(concert.NormalizedTitle),
                    AppDbContext.ImmutableUnaccent(normalizedSearch)
                )
            );
        }

        if (request.PartyIds?.Count > 0)
        {
            query = query.Where(concert =>
                concert.ConcertParties.Any(concertParty =>
                    request.PartyIds.Contains(concertParty.PartyId)
                    && (
                        concertParty.Role == ConcertPartyRole.MainArtist
                        || request.IsIncludeInGuestCredit
                    )
                )
            );
        }

        return query;
    }

    public async Task<IReadOnlyList<ConcertListItem>> GetAllAsync(
        ConcertListRequest request,
        CancellationToken cancellationToken = default
    )
    {
        IQueryable<Core.Entities.Concert> query = FilterListQuery(request);

        query = request.Sort switch
        {
            ListSortOption.TitleDesc => query.OrderByDescending(concert => concert.Title),
            ListSortOption.CreatedAtDesc => query.OrderByDescending(concert => concert.CreatedAt),
            ListSortOption.CreatedAtAsc => query.OrderBy(concert => concert.CreatedAt),
            _ => query.OrderBy(concert => concert.Title),
        };

        if (request.Limit > 0)
        {
            query = query.Take(request.Limit);
        }

        List<Core.Entities.Concert> concerts = await query
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
                    .ThenInclude(party => party!.Images)
                        .ThenInclude(image => image.File)
                            .ThenInclude(file => file!.FileObjects)
            .Include(concert => concert.ConcertFiles)
                .ThenInclude(concertFile => concertFile.File)
                    .ThenInclude(file => file!.FileObjects)
            .FirstOrDefaultAsync(concert => concert.Id == concertId, cancellationToken);

        if (concert is null)
            throw new EntityNotFoundException($"Concert {concertId} not found");

        Dictionary<int, IReadOnlyList<SubtitleSummary>> subtitles =
            await subtitleService.GetSummariesByConcertFileAsync(
                concert.ConcertFiles.Select(concertFile => concertFile.Id).ToList(),
                cancellationToken
            );

        List<AlbumListItem> linkedAlbums = await dbContext.LoadAlbumListItemsAsync(
            dbContext.Albums.Where(album =>
                dbContext.ConcertAlbums.Any(concertAlbum =>
                    concertAlbum.ConcertId == concertId && concertAlbum.AlbumId == album.Id
                )
            ),
            assetsService,
            cancellationToken
        );

        return concert.ToDetails(
            contentService,
            assetsService,
            ShareLinks.Concert(baseOptions.Value, concert.Id),
            subtitles,
            linkedAlbums
        );
    }
}
