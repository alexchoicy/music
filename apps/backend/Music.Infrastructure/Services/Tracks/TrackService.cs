using Microsoft.EntityFrameworkCore;
using Music.Core.Common.Enums;
using Music.Core.Entities;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Images.Enums;
using Music.Core.Services.Tracks;
using Music.Core.Services.Tracks.Enums;
using Music.Core.Storage;
using Music.Infrastructure.Data;

namespace Music.Infrastructure.Services.Tracks;

public sealed class TrackService(AppDbContext dbContext, IAssetsService assetsService)
    : ITrackService
{
    public async Task<TrackPlaybackDetails?> GetPlaybackDetailsAsync(
        int trackId,
        CancellationToken cancellationToken = default
    )
    {
        AlbumTrack? albumTrack = await dbContext
            .AlbumTracks.AsNoTracking()
            .AsSplitQuery()
            .Include(item => item.Track)
                .ThenInclude(track => track!.Credits)
                    .ThenInclude(credit => credit.Party)
            .Include(item => item.AlbumDisc)
                .ThenInclude(disc => disc!.Images)
                    .ThenInclude(image => image.File)
                        .ThenInclude(file => file!.FileObjects)
            .Include(item => item.AlbumDisc)
                .ThenInclude(disc => disc!.Album)
                    .ThenInclude(album => album!.Credits)
                        .ThenInclude(credit => credit.Party)
            .Include(item => item.AlbumDisc)
                .ThenInclude(disc => disc!.Album)
                    .ThenInclude(album => album!.Images)
                        .ThenInclude(image => image.File)
                            .ThenInclude(file => file!.FileObjects)
            .Where(item => item.TrackId == trackId)
            .OrderBy(item => item.AlbumDisc!.AlbumId)
            .ThenBy(item => item.AlbumDisc!.DiscNumber)
            .ThenBy(item => item.TrackNumber)
            .FirstOrDefaultAsync(cancellationToken);

        if (
            albumTrack?.Track is not Core.Entities.Track track
            || albumTrack.AlbumDisc is not AlbumDisc disc
            || disc.Album is not Core.Entities.Album album
        )
        {
            return null;
        }

        string[] artists = track
            .Credits.Where(credit => credit.Credit == CreditType.Artist && credit.Party is not null)
            .Select(credit => credit.Party!.Name)
            .Distinct()
            .Order()
            .ToArray();
        if (artists.Length == 0)
        {
            artists = album
                .Credits.Where(credit =>
                    credit.Credit == CreditType.Artist && credit.Party is not null
                )
                .Select(credit => credit.Party!.Name)
                .Distinct()
                .Order()
                .ToArray();
        }

        return new TrackPlaybackDetails
        {
            Title = track.Title,
            DurationInMs = track.DurationInMs,
            Artists = artists,
            AlbumTitle = album.Title,
            CoverUrl = GetCoverUrl(disc, album),
        };
    }

    public async Task<RadioTrack?> GetRadioTrackAsync(
        RadioTrackRequest request,
        CancellationToken cancellationToken = default
    )
    {
        int[] queueTrackIds = request.QueueTrackIds.Distinct().ToArray();
        int[] languageIds = await dbContext
            .Tracks.AsNoTracking()
            .Where(track => queueTrackIds.Contains(track.Id) && track.LanguageId != null)
            .Select(track => track.LanguageId!.Value)
            .Distinct()
            .ToArrayAsync(cancellationToken);

        IQueryable<AlbumTrack> candidates = dbContext
            .AlbumTracks.AsNoTracking()
            .Where(item =>
                item.Track!.ContentType == TrackContentType.Music
                && item.Track.Audios.Any()
                && !queueTrackIds.Contains(item.TrackId)
            );
        if (!request.IncludeInstrumental)
            candidates = candidates.Where(item =>
                item.Track!.VersionType != TrackVersionType.Instrumental
            );

        // Stay in the queue's languages until they run out of unqueued music.
        if (languageIds.Length > 0)
        {
            RadioTrack? sameLanguageTrack = await PickRandomAsync(
                candidates.Where(item =>
                    item.Track!.LanguageId != null
                    && languageIds.Contains(item.Track.LanguageId.Value)
                ),
                cancellationToken
            );
            if (sameLanguageTrack is not null)
                return sameLanguageTrack;
        }

        return await PickRandomAsync(candidates, cancellationToken);
    }

    private static Task<RadioTrack?> PickRandomAsync(
        IQueryable<AlbumTrack> candidates,
        CancellationToken cancellationToken
    ) =>
        candidates
            .OrderBy(_ => EF.Functions.Random())
            .Select(item => new RadioTrack
            {
                AlbumId = item.AlbumDisc!.AlbumId,
                AlbumDiscId = item.AlbumDiscId,
                TrackId = item.TrackId,
            })
            .FirstOrDefaultAsync(cancellationToken);

    private string? GetCoverUrl(AlbumDisc disc, Core.Entities.Album album)
    {
        FileObject? fileObject = disc
            .Images.Where(image => image.ImageRole == ImageRole.Cover)
            .OrderByDescending(image => image.IsPrimary)
            .ThenBy(image => image.CreatedAt)
            .Concat(
                album
                    .Images.Where(image =>
                        image.AlbumDiscId is null && image.ImageRole == ImageRole.Cover
                    )
                    .OrderByDescending(image => image.IsPrimary)
                    .ThenBy(image => image.CreatedAt)
            )
            .SelectMany(image =>
                image.File is null
                    ? Enumerable.Empty<FileObject>()
                    : image
                        .File.FileObjects.Where(file =>
                            file.ProcessingStatus == FileProcessingStatus.Completed
                            && file.FileObjectVariant
                                is FileObjectVariant.ImageCover1024x1024
                                    or FileObjectVariant.Original
                        )
                        .OrderBy(file =>
                            file.FileObjectVariant == FileObjectVariant.ImageCover1024x1024 ? 0 : 1
                        )
            )
            .FirstOrDefault();

        return fileObject is null ? null : assetsService.GetUrl(fileObject.StoragePath);
    }
}
