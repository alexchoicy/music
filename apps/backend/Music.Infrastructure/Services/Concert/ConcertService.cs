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
using Music.Infrastructure.Mappers;

namespace Music.Infrastructure.Services.Concert;

public sealed class ConcertService(
    AppDbContext dbContext,
    IContentService contentService,
    IAssetsService assetsService,
    ITokenService tokenService,
    ILogger<ConcertService> logger) : IConcertService
{
    private readonly AppDbContext _dbContext = dbContext;
    private readonly IContentService _contentService = contentService;
    private readonly ILogger<ConcertService> _logger = logger;
    private readonly IAssetsService _assetsService = assetsService;
    private readonly ITokenService _tokenService = tokenService;

    public async Task<IReadOnlyList<ConcertListItemModel>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        List<Core.Entities.Concert> concerts = await _dbContext.Concerts
            .AsNoTracking()
            .AsSplitQuery()
            .Include(c => c.Cover)
                .ThenInclude(cover => cover!.File)
                .ThenInclude(file => file!.FileObjects)
            .Include(c => c.ConcertAlbums)
            .Include(c => c.ConcertParties)
                .ThenInclude(concertParty => concertParty.Party)
            .Include(c => c.ConcertFiles)
            .OrderByDescending(c => c.Date ?? c.CreatedAt)
            .ThenByDescending(c => c.CreatedAt)
            .ToListAsync(cancellationToken);

        return concerts
            .Select(concert => new ConcertListItemModel
            {
                ConcertId = concert.Id,
                Title = concert.Title,
                Description = concert.Description,
                Date = concert.Date,
                CoverVariants = ConcertResponseMappingExtensions.ToConcertCoverVariants(concert, _assetsService),
                Parties = ConcertResponseMappingExtensions.ToConcertPartySummaryModels(concert.ConcertParties),
                AlbumCount = concert.ConcertAlbums.Count,
                FileCount = concert.ConcertFiles.Count,
                CreatedAt = concert.CreatedAt,
                UpdatedAt = concert.UpdatedAt,
            })
            .ToList();
    }

    public async Task<ConcertDetailsModel> GetByIdAsync(
        int concertId,
        CancellationToken cancellationToken = default)
    {
        Core.Entities.Concert concert = await _dbContext.Concerts
            .AsNoTracking()
            .AsSplitQuery()
            .Include(c => c.Cover)
                .ThenInclude(cover => cover!.File)
                .ThenInclude(file => file!.FileObjects)
            .Include(c => c.ConcertAlbums)
                .ThenInclude(concertAlbum => concertAlbum.Album)
                .ThenInclude(album => album!.Credits)
                .ThenInclude(credit => credit.Party)
            .Include(c => c.ConcertAlbums)
                .ThenInclude(concertAlbum => concertAlbum.Album)
                .ThenInclude(album => album!.Discs)
                .ThenInclude(disc => disc.Tracks)
                .ThenInclude(track => track.Track)
            .Include(c => c.ConcertAlbums)
                .ThenInclude(concertAlbum => concertAlbum.Album)
                .ThenInclude(album => album!.Images)
                .ThenInclude(image => image.File)
                .ThenInclude(file => file!.FileObjects)
            .Include(c => c.ConcertParties)
                .ThenInclude(concertParty => concertParty.Party)
            .Include(c => c.ConcertFiles)
                .ThenInclude(concertFile => concertFile.File)
                .ThenInclude(file => file!.FileObjects)
            .FirstOrDefaultAsync(c => c.Id == concertId, cancellationToken)
            ?? throw new EntityNotFoundException($"Concert {concertId} not found");

        return new ConcertDetailsModel
        {
            ConcertId = concert.Id,
            Title = concert.Title,
            Description = concert.Description,
            Date = concert.Date,
            CoverVariants = ConcertResponseMappingExtensions.ToConcertCoverVariants(concert, _assetsService),
            LinkedParties = ConcertResponseMappingExtensions.ToConcertPartySummaryModels(concert.ConcertParties),
            LinkedAlbums = concert.ConcertAlbums
                .Where(concertAlbum => concertAlbum.Album is not null)
                .Select(concertAlbum => concertAlbum.Album!)
                .DistinctBy(album => album.Id)
                .OrderBy(album => album.ReleaseDate ?? album.CreatedAt)
                .ThenBy(album => album.Title)
                .Select(album => album.ToListItemModel(_assetsService))
                .ToList(),
            Files = concert.ConcertFiles
                .OrderBy(concertFile => concertFile.Order)
                .ThenBy(concertFile => concertFile.Id)
                .Select(concertFile => new ConcertFileDetailsModel
                {
                    ConcertFileId = concertFile.Id,
                    Title = concertFile.Title,
                    Type = concertFile.Type,
                    Order = concertFile.Order,
                    File = ConcertResponseMappingExtensions.ToConcertFileVariantsModel(
                        concertFile.File,
                        _contentService,
                        _assetsService)
                })
                .ToList(),
            CreatedAt = concert.CreatedAt,
            UpdatedAt = concert.UpdatedAt,
        };
    }

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

    public async Task<CreateConcertWithoutUploadResult> CreateConcertWithoutUploadAsync(
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

            CreateConcertWithoutUploadResult uploadResult = new()
            {
                Token = await _tokenService.GenerateUploadToken(userId),
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

                uploadResult.Files.Add(new CreateConcertWithoutUploadItemResult
                {
                    FileName = file.OriginalFileName,
                    FileObjectId = fileObject.Id,
                    SimpleBlake3Hash = file.SimpleBlake3Hash,
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
