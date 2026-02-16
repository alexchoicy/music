using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;
using Music.Core.Exceptions;
using Music.Core.Enums;
using Music.Core.Models;
using Music.Core.Services.Interfaces;
using Music.Core.Utils;
using Music.Infrastructure.Data;
using Music.Core.Entities;

namespace Music.Infrastructure.Services.Album;

public class AlbumService(AppDbContext dbContext, IContentService contentService, IAssetsService assetsService, ILogger<AlbumService> logger) : IAlbumService
{
    private readonly AppDbContext _dbContext = dbContext;
    private readonly IContentService _contentService = contentService;
    private readonly IAssetsService _assetsService = assetsService;
    private readonly ILogger<AlbumService> _logger = logger;

    public async Task<AlbumDetailsModel> GetByIdAsync(
        int albumId,
        CancellationToken cancellationToken = default)
    {
        Core.Entities.Album? album = await _dbContext.Albums
            .AsNoTracking()
            .AsSplitQuery()
            .Include(a => a.Credits)
                .ThenInclude(c => c.Party)
            .Include(a => a.Discs)
                .ThenInclude(d => d.Tracks)
                .ThenInclude(at => at.Track!)
                .ThenInclude(t => t.Credits)
                .ThenInclude(tc => tc.Party)
            .Include(a => a.Discs)
                .ThenInclude(d => d.Tracks)
                .ThenInclude(at => at.Track!)
                .ThenInclude(t => t.Variants)
                .ThenInclude(v => v.Sources)
                .ThenInclude(s => s.File!)
                .ThenInclude(f => f.FileObjects)
            .Include(a => a.Images)
                .ThenInclude(i => i.File)
                .ThenInclude(f => f!.FileObjects)
            .FirstOrDefaultAsync(a => a.Id == albumId, cancellationToken);

        if (album is null)
            throw new EntityNotFoundException($"Album {albumId} not found");

        List<AlbumDiscDetailsModel> discs = album.Discs
            .OrderBy(d => d.DiscNumber)
            .Select(d => new AlbumDiscDetailsModel
            {
                DiscNumber = d.DiscNumber,
                Subtitle = d.Subtitle,
                Tracks = d.Tracks
                    .OrderBy(at => at.TrackNumber)
                    .Select(at =>
                    {
                        Track track = at.Track!;

                        List<TrackVariantDetailsModel> variants = track.Variants
                            .OrderBy(v => v.VariantType)
                            .Select(v => new TrackVariantDetailsModel
                            {
                                VariantType = v.VariantType,
                                Sources = v.Sources
                                    .OrderByDescending(s => s.Pinned)
                                    .ThenBy(s => s.Rank)
                                     .Select(s => new TrackSourceDetailsModel
                                     {
                                         Source = s.Source,
                                         Rank = s.Rank,
                                         Pinned = s.Pinned,
                                         File = BuildTrackSourceFiles(s.File)
                                     })
                                     .ToList()
                            })
                             .ToList();

                        return new AlbumTrackDetailsModel
                        {
                            TrackId = track.Id,
                            TrackNumber = at.TrackNumber,
                            Title = track.Title,
                            DurationInMs = track.DurationInMs,
                            Credits = track.Credits
                                .Where(c => c.Party is not null)
                                .OrderBy(c => c.Party!.Name)
                                .Select(c => new TrackPartyCreditModel
                                {
                                    PartyId = c.PartyId,
                                    Name = c.Party!.Name,
                                    Type = c.Party!.Type,
                                    CreditType = c.Credit,
                                })
                                .ToList(),
                            TrackVariants = variants,
                        };
                    })
                    .ToList()
            })
            .ToList();

        int totalTrackCount = discs.Sum(d => d.Tracks.Count);
        int totalDurationInMs = discs.SelectMany(d => d.Tracks).Sum(t => t.DurationInMs);

        List<AlbumCoverVariantModel>? coverImageUrl = album.Images.FirstOrDefault()?.File?.FileObjects
            .Select(file => new AlbumCoverVariantModel
            {
                Variant = file.FileObjectVariant,
                Url = _assetsService.GetUrl(file.StoragePath)
            })
            .ToList() ?? [];

        return new AlbumDetailsModel
        {
            AlbumId = album.Id,
            Title = album.Title,
            Type = album.Type,
            CoverImageUrl = coverImageUrl[0].Url ?? null,
            ReleaseDate = album.ReleaseDate,
            TotalTrackCount = totalTrackCount,
            TotalDurationInMs = totalDurationInMs,
            Credits = album.Credits
                .Select(c => new AlbumPartyCreditModel
                {
                    PartyId = c.PartyId,
                    Name = c.Party!.Name,
                    Type = c.Party!.Type,
                    CreditType = c.Credit,
                })
                .ToList(),
            Discs = discs,
        };
    }

    private TrackSourceFileVariantsModel BuildTrackSourceFiles(StoredFile? storedFile)
    {
        if (storedFile?.FileObjects is null)
            throw new InvalidOperationException("Track source file is missing file objects");

        FileObject? original = storedFile.FileObjects
            .FirstOrDefault(fo => fo.FileObjectVariant == FileObjectVariant.Original);

        if (original is null)
            throw new InvalidOperationException("Track source file is missing Original file object variant");

        FileObject? opus96 = storedFile.FileObjects
            .FirstOrDefault(fo => fo.FileObjectVariant == FileObjectVariant.Opus96);

        return new TrackSourceFileVariantsModel
        {
            Original = ToDetailsModel(original),
            Opus96 = opus96 is null ? null : ToDetailsModel(opus96),
        };
    }

    private FileObjectDetailsModel ToDetailsModel(FileObject fo)
    {
        return new FileObjectDetailsModel
        {
            Id = fo.Id,
            Url = _contentService.GetUrl(fo.Id),
            Type = fo.Type,
            FileObjectVariant = fo.FileObjectVariant,
            SizeInBytes = fo.SizeInBytes,
            MimeType = fo.MimeType,
            Container = fo.Container,
            Extension = fo.Extension,
            Codec = fo.Codec,
            Width = fo.Width,
            Height = fo.Height,
            AudioSampleRate = fo.AudioSampleRate,
            Bitrate = fo.Bitrate,
            FrameRate = fo.FrameRate,
            DurationInMs = fo.DurationInMs,
            OriginalFileName = fo.OriginalFileName,
            CreatedAt = fo.CreatedAt,
            UpdatedAt = fo.UpdatedAt,
        };
    }

    public async Task<IReadOnlyList<AlbumListItemModel>> GetAllForListAsync(
        CancellationToken cancellationToken = default)
    {
        List<Core.Entities.Album> albums = await _dbContext.Albums
            .AsNoTracking()
            .AsSplitQuery()
            .Include(a => a.Credits)
                .ThenInclude(c => c.Party)
            .Include(a => a.Discs)
                .ThenInclude(d => d.Tracks)
                .ThenInclude(at => at.Track)
            .Include(a => a.Images)
                .ThenInclude(i => i.File)
                .ThenInclude(f => f!.FileObjects)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(cancellationToken);

        return albums
            .Select(a =>
            {

                return new AlbumListItemModel
                {
                    AlbumId = a.Id,
                    Title = a.Title,
                    Description = a.Description,
                    Type = a.Type,
                    ReleaseDate = a.ReleaseDate,
                    CreatedAt = a.CreatedAt,
                    UpdatedAt = a.UpdatedAt,
                    CoverVariants = a.Images.FirstOrDefault()?.File?.FileObjects
                        .Select(file => new AlbumCoverVariantModel
                        {
                            Variant = file.FileObjectVariant,
                            Url = _assetsService.GetUrl(file.StoragePath)
                        })
                        .ToList() ?? [],
                    Artists = a.Credits
                        .Where(c => c.Credit == AlbumCreditType.Artist)
                        .OrderBy(c => c.Party!.Name)
                        .Select(c => new AlbumListArtistModel
                        {
                            PartyId = c.PartyId,
                            Name = c.Party!.Name,
                        })
                        .ToList(),
                    TrackCount = a.Discs.Sum(d => d.Tracks.Count),
                    TotalDurationInMs = a.Discs
                        .SelectMany(d => d.Tracks)
                        .Sum(at => at.Track?.DurationInMs ?? 0),
                };
            })
            .ToList();
    }

    public async Task<IReadOnlyList<CreateAlbumResult>> CreateAlbumAsync(
        IReadOnlyList<CreateAlbumModel> albums,
        string userId,
        CancellationToken cancellationToken = default)
    {
        if (albums.Count == 0)
            return [];

        List<CreateAlbumResult> results = new(albums.Count);

        foreach (var album in albums)
        {
            if (await AlbumExistsAsync(album, cancellationToken))
            {
                results.Add(CreateAlbumResult.Failure(
                    album.Title,
                    "Album already exists with the same title and artists"));
                continue;
            }

            await using IDbContextTransaction transaction = await _dbContext.Database
                .BeginTransactionAsync(cancellationToken);

            try
            {
                CreateAlbumUploadResult uploadResults = await CreateSingleAlbum(album, userId);
                await _dbContext.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                results.Add(CreateAlbumResult.Success(album.Title, uploadResults));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating album {AlbumTitle}", album.Title);
                await transaction.RollbackAsync(cancellationToken);
                _dbContext.ChangeTracker.Clear();
                results.Add(CreateAlbumResult.Failure(album.Title, "Failed to create this album"));
            }
        }

        return results;
    }

    private async Task<bool> AlbumExistsAsync(
        CreateAlbumModel album,
        CancellationToken cancellationToken)
    {
        string normalizedTitle = StringUtils.NormalizeString(album.Title);

        List<int> inputArtistIds = album.AlbumCredits
            .Where(c => c.Credit == AlbumCreditType.Artist)
            .Select(c => c.PartyId)
            .OrderBy(id => id)
            .ToList();

        if (inputArtistIds.Count == 0)
            return false;

        List<Core.Entities.Album> matchingAlbums = await _dbContext.Albums
            .Where(a => a.NormalizedTitle == normalizedTitle)
            .Include(a => a.Credits)
            .ToListAsync(cancellationToken);

        foreach (var existingAlbum in matchingAlbums)
        {
            List<int> existingArtistIds = existingAlbum.Credits
                .Where(c => c.Credit == AlbumCreditType.Artist)
                .Select(c => c.PartyId)
                .OrderBy(id => id)
                .ToList();

            if (inputArtistIds.SequenceEqual(existingArtistIds))
                return true;
        }

        return false;
    }

    private async Task<CreateAlbumUploadResult> CreateSingleAlbum(CreateAlbumModel album, string userId)
    {
        var newAlbum = new Core.Entities.Album
        {
            Title = album.Title,
            Description = album.Description,
            Type = album.Type,
            LanguageId = album.LanguageId == 0 ? null : album.LanguageId,
            CreatedByUserId = userId,
            ReleaseDate = album.ReleaseDate
        };

        _dbContext.Albums.Add(newAlbum);

        var albumCredits = album.AlbumCredits.Select(ac => new AlbumCredit
        {
            Album = newAlbum,
            PartyId = ac.PartyId,
            Credit = ac.Credit
        });

        _dbContext.AlbumCredits.AddRange(albumCredits);

        CreateAlbumUploadResult uploadResults = new()
        {
            AlbumTitle = album.Title,
        };

        if (album.AlbumImage is not null)
        {
            uploadResults.AlbumImage = await CreateAlbumImage(album.AlbumImage, newAlbum, userId);
        }

        foreach (AlbumDiscModel albumDisc in album.Discs)
        {
            uploadResults.Tracks.AddRange(await CreateDisc(albumDisc, newAlbum, userId));
        }

        return uploadResults;
    }

    private async Task<List<CreateAlbumTrackUploadItemResult>> CreateDisc(AlbumDiscModel albumDisc, Core.Entities.Album album, string userId)
    {
        AlbumDisc newAlbumDisc = new()
        {
            Album = album,
            DiscNumber = albumDisc.DiscNumber,
            Subtitle = albumDisc.Subtitle
        };

        _dbContext.AlbumDiscs.Add(newAlbumDisc);

        List<CreateAlbumTrackUploadItemResult> sourceResults = [];

        foreach (AlbumTrackModel albumTrack in albumDisc.Tracks)
        {
            sourceResults.AddRange(await CreateTrack(albumTrack, newAlbumDisc, userId));
        }

        return sourceResults;
    }


    private async Task<CreateAlbumImageUploadItemResult> CreateAlbumImage(AlbumImageModel imageModel, Core.Entities.Album album, string userId)
    {
        string imagePath = _assetsService.GetStoragePath(
            MediaFolderOptions.AssetsCover,
            imageModel.File.FileBlake3,
            imageModel.File.Container);

        (StoredFile? storedFile, FileObject? fileObject) = _assetsService.CreateStoredFileWithObject(
            imageModel.File,
            FileType.Image,
            imagePath,
            userId);

        _dbContext.StoredFiles.Add(storedFile);
        _dbContext.FileObjects.Add(fileObject);

        AlbumImage albumImage = new()
        {
            Album = album,
            File = storedFile,
            IsPrimary = true,
            CropHeight = imageModel.FileCroppedArea?.Height,
            CropWidth = imageModel.FileCroppedArea?.Width,
            CropX = imageModel.FileCroppedArea?.X,
            CropY = imageModel.FileCroppedArea?.Y,
        };

        _dbContext.AlbumImages.Add(albumImage);

        return new CreateAlbumImageUploadItemResult
        {
            Blake3Id = imageModel.File.FileBlake3,
            FileName = imageModel.File.OriginalFileName,
            UploadUrl = _assetsService.CreateUploadUrlAsync(imagePath, fileObject.MimeType, CancellationToken.None)
        };
    }

    private async Task<List<CreateAlbumTrackUploadItemResult>> CreateTrack(AlbumTrackModel albumTrack, AlbumDisc albumDisc, string userId)
    {
        Track track = new()
        {
            Title = albumTrack.Title,
            IsMC = albumTrack.IsMC,
            Description = albumTrack.Description,
            DurationInMs = albumTrack.DurationInMs,
            LanguageId = albumTrack.LanguageId == 0 ? null : albumTrack.LanguageId,
            CreatedByUserId = userId
        };

        _dbContext.Tracks.Add(track);

        AlbumTrack newAlbumTrack = new()
        {
            AlbumDisc = albumDisc,
            Track = track,
            TrackNumber = albumTrack.TrackNumber,
        };

        _dbContext.AlbumTracks.Add(newAlbumTrack);

        IEnumerable<TrackCredit> trackCredits = albumTrack.TrackCredits.Select(tc => new TrackCredit
        {
            Track = track,
            PartyId = tc.PartyId,
            Credit = tc.Credit
        });

        _dbContext.TrackCredits.AddRange(trackCredits);

        List<CreateAlbumTrackUploadItemResult> sourceResults = [];

        foreach (TrackVariantModel trackVariant in albumTrack.TrackVariants)
        {
            sourceResults.AddRange(await CreateTrackVariant(trackVariant, track, userId));
        }

        return sourceResults;
    }

    private async Task<List<CreateAlbumTrackUploadItemResult>> CreateTrackVariant(TrackVariantModel variantModel, Track track, string userId)
    {
        var newTrackVariant = new TrackVariant
        {
            Track = track,
            VariantType = variantModel.VariantType
        };

        _dbContext.TrackVariants.Add(newTrackVariant);

        List<CreateAlbumTrackUploadItemResult> sourceResults = [];

        foreach (TrackSourceModel trackSource in variantModel.Sources)
        {
            sourceResults.Add(await CreateTrackSource(trackSource, newTrackVariant, userId));
        }

        return sourceResults;
    }

    private async Task<CreateAlbumTrackUploadItemResult> CreateTrackSource(TrackSourceModel sourceModel, TrackVariant trackVariant, string userId)
    {
        string path = _contentService.GetStoragePath(
            MediaFolderOptions.OriginalMusic,
            sourceModel.File.FileBlake3,
            sourceModel.File.Container);

        (StoredFile? storedFile, FileObject? fileObject) = _assetsService.CreateStoredFileWithObject(
            sourceModel.File,
            FileType.Audio,
            path,
            userId);

        _dbContext.StoredFiles.Add(storedFile);
        _dbContext.FileObjects.Add(fileObject);

        Core.Entities.TrackSource newTrackSource = new()
        {
            TrackVariant = trackVariant,
            Source = sourceModel.Source,
            File = storedFile,
            UploadedByUserId = userId
        };

        _dbContext.TrackSources.Add(newTrackSource);

        return new CreateAlbumTrackUploadItemResult
        {
            Blake3Id = sourceModel.File.FileBlake3,
            FileName = sourceModel.File.OriginalFileName,
            MultipartUploadInfo = await _contentService.CreateMultipartUploadAsync(path, fileObject.MimeType, fileObject.SizeInBytes, CancellationToken.None)
        };
    }

}
