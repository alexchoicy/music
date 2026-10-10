using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Music.Core.Common.Enums;
using Music.Core.Common.Exceptions;
using Music.Core.Entities;
using Music.Core.Options;
using Music.Core.Services.Albums;
using Music.Core.Services.Albums.Requests;
using Music.Core.Services.Albums.Results;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;
using Music.Core.Storage;
using Music.Core.Workers;
using Music.Infrastructure.Data;
using Music.Infrastructure.Mappers;

namespace Music.Infrastructure.Services.Album;

public class AlbumEditService(AppDbContext dbContext, IAssetsService assetsService)
    : IAlbumEditService
{
    // Seeded "Unknown" party, used when an album has no artists
    private const int UnknownPartyId = 1;

    public async Task<AlbumEditDetails> GetAsync(
        int albumId,
        CancellationToken cancellationToken = default
    )
    {
        Core.Entities.Album album =
            await QueryAlbum()
                .AsNoTracking()
                .FirstOrDefaultAsync(album => album.Id == albumId, cancellationToken)
            ?? throw new EntityNotFoundException($"Album {albumId} not found");

        List<int> trackIds = album
            .Discs.SelectMany(disc => disc.Tracks)
            .Select(albumTrack => albumTrack.TrackId)
            .ToList();

        Dictionary<int, int> otherAlbumCounts = await dbContext
            .AlbumTracks.AsNoTracking()
            .Where(albumTrack =>
                trackIds.Contains(albumTrack.TrackId) && albumTrack.AlbumDisc!.AlbumId != albumId
            )
            .GroupBy(albumTrack => albumTrack.TrackId)
            .Select(group => new
            {
                TrackId = group.Key,
                Count = group
                    .Select(albumTrack => albumTrack.AlbumDisc!.AlbumId)
                    .Distinct()
                    .Count(),
            })
            .ToDictionaryAsync(item => item.TrackId, item => item.Count, cancellationToken);

        return new AlbumEditDetails
        {
            AlbumId = album.Id,
            Title = album.Title,
            Description = album.Description,
            Type = album.Type,
            LanguageId = album.LanguageId,
            ReleaseDate = album.ReleaseDate,
            Version = album.Version,
            ArtistIds = album
                .Credits.Where(credit => credit.Credit == CreditType.Artist)
                .Select(credit => credit.PartyId)
                .ToList(),
            Cover = ToEditCover(GetPrimaryImage(album, null)),
            Discs = album
                .Discs.OrderBy(disc => disc.DiscNumber)
                .Select(disc => new AlbumEditDisc
                {
                    AlbumDiscId = disc.Id,
                    DiscNumber = disc.DiscNumber,
                    Subtitle = disc.Subtitle,
                    Cover = ToEditCover(GetPrimaryImage(album, disc.Id)),
                    Tracks = disc
                        .Tracks.OrderBy(albumTrack => albumTrack.TrackNumber)
                        .Select(albumTrack => new AlbumEditTrack
                        {
                            TrackId = albumTrack.TrackId,
                            TrackNumber = albumTrack.TrackNumber,
                            Title = albumTrack.Track!.Title,
                            DurationInMs = albumTrack.Track.DurationInMs,
                            ContentType = albumTrack.Track.ContentType,
                            VersionType = albumTrack.Track.VersionType,
                            LanguageId = albumTrack.Track.LanguageId,
                            ArtistIds = albumTrack
                                .Track.Credits.Where(credit => credit.Credit == CreditType.Artist)
                                .Select(credit => credit.PartyId)
                                .ToList(),
                            OtherAlbumCount = otherAlbumCounts.GetValueOrDefault(
                                albumTrack.TrackId
                            ),
                        })
                        .ToList(),
                })
                .ToList(),
        };
    }

    public async Task<AlbumEditDetails> UpdateDetailsAsync(
        int albumId,
        UpdateAlbumDetailsRequest request,
        CancellationToken cancellationToken = default
    )
    {
        Core.Entities.Album album =
            await dbContext
                .Albums.Include(album => album.Credits)
                .FirstOrDefaultAsync(album => album.Id == albumId, cancellationToken)
            ?? throw new EntityNotFoundException($"Album {albumId} not found");

        dbContext.Entry(album).Property(a => a.Version).OriginalValue = request.Version;

        int? languageId = request.LanguageId is null or 0 ? null : request.LanguageId;
        await EnsureLanguageExistsAsync(languageId, cancellationToken);

        List<int> artistIds = request.ArtistIds.Distinct().ToList();
        if (artistIds.Count == 0)
            artistIds.Add(UnknownPartyId);
        await EnsurePartiesExistAsync(artistIds, cancellationToken);

        album.Title = request.Title.Trim();
        album.Description = request.Description;
        album.Type = request.Type;
        album.LanguageId = languageId;
        album.ReleaseDate = request.ReleaseDate;
        // Always bump the row so a credits-only change still checks the version
        album.UpdatedAt = DateTimeOffset.UtcNow;

        SyncArtistCredits(
            album.Credits,
            artistIds,
            partyId => new AlbumCredit
            {
                Album = album,
                PartyId = partyId,
                Credit = CreditType.Artist,
            },
            credit => credit.PartyId,
            credit => credit.Credit,
            dbContext.AlbumCredits
        );

        await dbContext.SaveChangesAsync(cancellationToken);

        return await GetAsync(albumId, cancellationToken);
    }

    public async Task<UpdateAlbumCoverResult> UpdateCoverAsync(
        int albumId,
        UpdateAlbumCoverRequest request,
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        Core.Entities.Album album =
            await dbContext
                .Albums.AsSplitQuery()
                .Include(album => album.Discs)
                .Include(album => album.Images)
                    .ThenInclude(image => image.File)
                        .ThenInclude(file => file!.FileObjects)
                .FirstOrDefaultAsync(album => album.Id == albumId, cancellationToken)
            ?? throw new EntityNotFoundException($"Album {albumId} not found");

        AlbumDisc? disc = null;
        if (request.AlbumDiscId is { } albumDiscId)
        {
            disc =
                album.Discs.FirstOrDefault(item => item.Id == albumDiscId)
                ?? throw new ValidationException($"Disc {albumDiscId} is not part of this album.");
        }

        await using IDbContextTransaction transaction =
            await dbContext.Database.BeginTransactionAsync(cancellationToken);

        CreateAlbumImageUploadItemResult? upload = null;
        StoredFile? fileToReprocess = null;

        if (request.Image is not null)
        {
            (StoredFile storedFile, upload, bool needsReprocess) = await ResolveCoverFileAsync(
                request.Image,
                disc,
                userId,
                cancellationToken
            );

            await ReplaceTargetImageAsync(
                album,
                disc,
                storedFile,
                request.Image.CroppedArea,
                cancellationToken
            );

            if (needsReprocess)
                fileToReprocess = storedFile;
        }
        else if (request.CroppedArea is not null)
        {
            AlbumImage current =
                GetPrimaryImage(album, disc?.Id)
                ?? throw new ValidationException("There is no cover to crop.");

            // The worker makes one cover variant per file, so every use of the file shares the crop
            foreach (AlbumImage image in album.Images.Where(i => i.FileId == current.FileId))
            {
                image.CropX = request.CroppedArea.X;
                image.CropY = request.CroppedArea.Y;
                image.CropWidth = request.CroppedArea.Width;
                image.CropHeight = request.CroppedArea.Height;
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            fileToReprocess = current.File;
        }
        else if (request.UseAlbumCover)
        {
            AlbumImage albumCover =
                GetPrimaryImage(album, null)
                ?? throw new ValidationException("The album has no cover to use.");

            await ReplaceTargetImageAsync(
                album,
                disc,
                albumCover.File!,
                ToCroppedArea(albumCover),
                cancellationToken
            );
        }
        else if (request.Remove)
        {
            RemoveTargetImages(album, disc);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);

        if (fileToReprocess is not null)
            await ReprocessImageAsync(fileToReprocess, cancellationToken);

        return new UpdateAlbumCoverResult
        {
            Album = await GetAsync(albumId, cancellationToken),
            Upload = upload,
        };
    }

    public async Task<AlbumEditDetails> UpdateTracksAsync(
        int albumId,
        UpdateAlbumTracksRequest request,
        CancellationToken cancellationToken = default
    )
    {
        Core.Entities.Album album =
            await dbContext
                .Albums.AsSplitQuery()
                .Include(album => album.Discs)
                    .ThenInclude(disc => disc.Tracks)
                        .ThenInclude(albumTrack => albumTrack.Track!)
                            .ThenInclude(track => track.Credits)
                .FirstOrDefaultAsync(album => album.Id == albumId, cancellationToken)
            ?? throw new EntityNotFoundException($"Album {albumId} not found");

        dbContext.Entry(album).Property(a => a.Version).OriginalValue = request.Version;

        Dictionary<int, AlbumDisc> discs = album.Discs.ToDictionary(disc => disc.Id);
        Dictionary<int, AlbumTrack> albumTracks = album
            .Discs.SelectMany(disc => disc.Tracks)
            .ToDictionary(albumTrack => albumTrack.TrackId);

        if (!discs.Keys.ToHashSet().SetEquals(request.Discs.Select(d => d.AlbumDiscId)))
            throw new ValidationException("Every disc of the album must be listed exactly once.");

        if (
            !albumTracks
                .Keys.ToHashSet()
                .SetEquals(request.Discs.SelectMany(d => d.Tracks).Select(t => t.TrackId))
        )
            throw new ValidationException("Every track of the album must be listed exactly once.");

        List<UpdateAlbumTrackRequest> trackRequests = request
            .Discs.SelectMany(disc => disc.Tracks)
            .ToList();

        foreach (int? languageId in trackRequests.Select(t => t.LanguageId).Distinct())
            await EnsureLanguageExistsAsync(languageId is 0 ? null : languageId, cancellationToken);

        await EnsurePartiesExistAsync(
            trackRequests.SelectMany(t => t.ArtistIds).Distinct().ToList(),
            cancellationToken
        );

        foreach (UpdateAlbumDiscRequest discRequest in request.Discs)
        {
            AlbumDisc disc = discs[discRequest.AlbumDiscId];
            disc.Subtitle = discRequest.Subtitle.Trim();

            for (int index = 0; index < discRequest.Tracks.Count; index++)
            {
                UpdateAlbumTrackRequest trackRequest = discRequest.Tracks[index];
                AlbumTrack albumTrack = albumTracks[trackRequest.TrackId];
                Track track = albumTrack.Track!;

                albumTrack.AlbumDisc = disc;
                albumTrack.TrackNumber = index + 1;

                track.Title = trackRequest.Title.Trim();
                track.ContentType = trackRequest.ContentType;
                track.VersionType = trackRequest.VersionType;
                track.LanguageId = trackRequest.LanguageId is null or 0
                    ? null
                    : trackRequest.LanguageId;

                SyncArtistCredits(
                    track.Credits,
                    trackRequest.ArtistIds.Distinct().ToList(),
                    partyId => new TrackCredit
                    {
                        Track = track,
                        PartyId = partyId,
                        Credit = CreditType.Artist,
                    },
                    credit => credit.PartyId,
                    credit => credit.Credit,
                    dbContext.TrackCredits
                );
            }
        }

        // Always bump the row so the version check covers track-only changes
        album.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return await GetAsync(albumId, cancellationToken);
    }

    private IQueryable<Core.Entities.Album> QueryAlbum() =>
        dbContext
            .Albums.AsSplitQuery()
            .Include(album => album.Credits)
            .Include(album => album.Images)
                .ThenInclude(image => image.File)
                    .ThenInclude(file => file!.FileObjects)
            .Include(album => album.Discs)
                .ThenInclude(disc => disc.Tracks)
                    .ThenInclude(albumTrack => albumTrack.Track!)
                        .ThenInclude(track => track.Credits);

    private static AlbumImage? GetPrimaryImage(Core.Entities.Album album, int? albumDiscId) =>
        album
            .Images.Where(image => image.AlbumDiscId == albumDiscId)
            .OrderByDescending(image => image.IsPrimary)
            .ThenBy(image => image.CreatedAt)
            .FirstOrDefault();

    private AlbumEditCover? ToEditCover(AlbumImage? image)
    {
        if (image?.File is null)
            return null;

        FileObject? original = image.File.FileObjects.FirstOrDefault(fileObject =>
            fileObject.FileObjectVariant == FileObjectVariant.Original
        );

        return new AlbumEditCover
        {
            FileId = image.FileId,
            ProcessingStatus = original?.ProcessingStatus ?? FileProcessingStatus.Pending,
            CroppedArea = ToCroppedArea(image),
            Variants = image.File.ToImageVariants(assetsService),
        };
    }

    private static FileCroppedAreaRequest? ToCroppedArea(AlbumImage image)
    {
        if (
            image.CropX is not { } x
            || image.CropY is not { } y
            || image.CropWidth is not { } width
            || image.CropHeight is not { } height
        )
            return null;

        return new FileCroppedAreaRequest
        {
            X = x,
            Y = y,
            Width = width,
            Height = height,
        };
    }

    // Returns the stored file for a new cover, reusing an existing upload of the same image
    private async Task<(
        StoredFile File,
        CreateAlbumImageUploadItemResult? Upload,
        bool NeedsReprocess
    )> ResolveCoverFileAsync(
        AlbumImageRequest image,
        AlbumDisc? disc,
        string userId,
        CancellationToken cancellationToken
    )
    {
        StoredFile? existing = await dbContext
            .StoredFiles.Include(file => file.FileObjects)
            .FirstOrDefaultAsync(
                file => file.OriginalBlake3Hash == image.File.Blake3Hash,
                cancellationToken
            );

        if (existing is not null)
        {
            FileObject? original = existing.FileObjects.FirstOrDefault(fileObject =>
                fileObject.FileObjectVariant == FileObjectVariant.Original
            );

            // An unfinished upload by the same user can be retried
            if (
                original is { ProcessingStatus: FileProcessingStatus.Pending }
                && existing.UploadedByUserId == userId
            )
                return (existing, CreateUpload(image, original, disc, cancellationToken), false);

            // Already uploaded, regenerate the cover with the new crop
            return (existing, null, true);
        }

        string imagePath = assetsService.GetStoragePath(
            MediaFolderOptions.AssetsCover,
            image.File.Blake3Hash,
            image.File.MimeType
        );

        (StoredFile storedFile, FileObject fileObject) = assetsService.CreateStoredFileWithObject(
            image.File,
            FileType.Image,
            imagePath,
            StorageArea.Assets,
            FileObjectVariant.Original,
            userId
        );

        dbContext.StoredFiles.Add(storedFile);
        dbContext.FileObjects.Add(fileObject);

        return (storedFile, CreateUpload(image, fileObject, disc, cancellationToken), false);
    }

    private CreateAlbumImageUploadItemResult CreateUpload(
        AlbumImageRequest image,
        FileObject fileObject,
        AlbumDisc? disc,
        CancellationToken cancellationToken
    ) =>
        new()
        {
            ClientReferenceId = image.ClientReferenceId,
            DiscNumber = disc?.DiscNumber,
            FileObjectId = fileObject.Id,
            Blake3Hash = fileObject.ObjectBlake3Hash,
            FileName = image.File.OriginalFileName,
            UploadUrl = assetsService.CreateUploadUrlAsync(
                fileObject.StoragePath,
                fileObject.MimeType,
                cancellationToken
            ),
        };

    // Deleted first: the primary cover per album/disc is unique
    private async Task ReplaceTargetImageAsync(
        Core.Entities.Album album,
        AlbumDisc? disc,
        StoredFile file,
        FileCroppedAreaRequest? croppedArea,
        CancellationToken cancellationToken
    )
    {
        RemoveTargetImages(album, disc);
        await dbContext.SaveChangesAsync(cancellationToken);

        AlbumImage image = new()
        {
            Album = album,
            AlbumDisc = disc,
            File = file,
            IsPrimary = true,
            CropX = croppedArea?.X,
            CropY = croppedArea?.Y,
            CropWidth = croppedArea?.Width,
            CropHeight = croppedArea?.Height,
        };
        album.Images.Add(image);

        // Keep the crop the same on every use of this file within the album
        foreach (AlbumImage other in album.Images.Where(i => i.FileId == file.Id && i != image))
        {
            other.CropX = image.CropX;
            other.CropY = image.CropY;
            other.CropWidth = image.CropWidth;
            other.CropHeight = image.CropHeight;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private void RemoveTargetImages(Core.Entities.Album album, AlbumDisc? disc)
    {
        foreach (AlbumImage image in album.Images.Where(i => i.AlbumDiscId == disc?.Id).ToList())
        {
            album.Images.Remove(image);
            dbContext.AlbumImages.Remove(image);
        }
    }

    private async Task ReprocessImageAsync(StoredFile file, CancellationToken cancellationToken)
    {
        FileObject? original = await dbContext.FileObjects.FirstOrDefaultAsync(
            fileObject =>
                fileObject.FileId == file.Id
                && fileObject.FileObjectVariant == FileObjectVariant.Original,
            cancellationToken
        );

        // Pending: bytes not uploaded yet. Uploaded/Processing: a job will pick up the new crop.
        if (
            original
            is not {
                ProcessingStatus: FileProcessingStatus.Completed or FileProcessingStatus.Failed
            }
        )
            return;

        original.ProcessingStatus = FileProcessingStatus.Uploaded;
        await dbContext.SaveChangesAsync(cancellationToken);

        await assetsService.RunBackgroundProcessUploadFileAsync(
            new ImageUploadProcessWorker { FileObjectId = original.Id },
            cancellationToken
        );
    }

    private static void SyncArtistCredits<TCredit>(
        ICollection<TCredit> credits,
        IReadOnlyCollection<int> partyIds,
        Func<int, TCredit> create,
        Func<TCredit, int> getPartyId,
        Func<TCredit, CreditType> getCreditType,
        DbSet<TCredit> set
    )
        where TCredit : class
    {
        foreach (
            TCredit credit in credits
                .Where(credit =>
                    getCreditType(credit) == CreditType.Artist
                    && !partyIds.Contains(getPartyId(credit))
                )
                .ToList()
        )
        {
            credits.Remove(credit);
            set.Remove(credit);
        }

        HashSet<int> existing = credits
            .Where(credit => getCreditType(credit) == CreditType.Artist)
            .Select(getPartyId)
            .ToHashSet();

        foreach (int partyId in partyIds.Where(id => !existing.Contains(id)))
            credits.Add(create(partyId));
    }

    private async Task EnsureLanguageExistsAsync(
        int? languageId,
        CancellationToken cancellationToken
    )
    {
        if (languageId is null)
            return;

        bool exists = await dbContext.Languages.AnyAsync(
            language => language.Id == languageId,
            cancellationToken
        );
        if (!exists)
            throw new ValidationException($"Language {languageId} does not exist.");
    }

    private async Task EnsurePartiesExistAsync(
        IReadOnlyCollection<int> partyIds,
        CancellationToken cancellationToken
    )
    {
        if (partyIds.Count == 0)
            return;

        int found = await dbContext.Parties.CountAsync(
            party => partyIds.Contains(party.Id),
            cancellationToken
        );
        if (found != partyIds.Count)
            throw new ValidationException("One or more artists do not exist.");
    }
}
