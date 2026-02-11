using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;
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
                Core.Entities.Album newAlbum = CreateSingleAlbum(album, userId);
                await _dbContext.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                results.Add(CreateAlbumResult.Success(album.Title, newAlbum.Id));
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

    private Core.Entities.Album CreateSingleAlbum(CreateAlbumModel album, string userId)
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

        if (album.AlbumImage is not null)
        {
            CreateAlbumImage(album.AlbumImage, newAlbum, userId);
        }

        foreach (AlbumDiscModel albumDisc in album.Discs)
        {
            CreateDisc(albumDisc, newAlbum, userId);
        }

        return newAlbum;
    }

    private void CreateDisc(AlbumDiscModel albumDisc, Core.Entities.Album album, string userId)
    {
        AlbumDisc newAlbumDisc = new()
        {
            Album = album,
            DiscNumber = albumDisc.DiscNumber,
            Subtitle = albumDisc.Subtitle
        };

        _dbContext.AlbumDiscs.Add(newAlbumDisc);

        foreach (AlbumTrackModel albumTrack in albumDisc.Tracks)
        {
            CreateTrack(albumTrack, newAlbumDisc, userId);
        }
    }


    private void CreateAlbumImage(AlbumImageModel imageModel, Core.Entities.Album album, string userId)
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
    }

    private void CreateTrack(AlbumTrackModel albumTrack, AlbumDisc albumDisc, string userId)
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

        foreach (TrackVariantModel trackVariant in albumTrack.TrackVariants)
        {
            CreateTrackVariant(trackVariant, track, userId);
        }
    }

    private void CreateTrackVariant(TrackVariantModel variantModel, Track track, string userId)
    {
        var newTrackVariant = new TrackVariant
        {
            Track = track,
            VariantType = variantModel.VariantType
        };

        _dbContext.TrackVariants.Add(newTrackVariant);

        foreach (TrackSourceModel trackSource in variantModel.Sources)
        {
            CreateTrackSource(trackSource, newTrackVariant, userId);
        }
    }

    private void CreateTrackSource(TrackSourceModel sourceModel, TrackVariant trackVariant, string userId)
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
    }

}
