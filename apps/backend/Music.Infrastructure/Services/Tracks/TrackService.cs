using Microsoft.EntityFrameworkCore;
using Music.Core.Common.Enums;
using Music.Core.Entities;
using Music.Core.Services.Albums.Enums;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Images.Enums;
using Music.Core.Services.Parties.Enums;
using Music.Core.Services.Tracks;
using Music.Core.Services.Tracks.Enums;
using Music.Core.Storage;
using Music.Infrastructure.Data;

namespace Music.Infrastructure.Services.Tracks;

public sealed class TrackService(AppDbContext dbContext, IAssetsService assetsService)
    : ITrackService
{
    private const int UnknownPartyId = 1;
    private const int RadioSeedTrackLimit = 50;
    private const int RadioPlayedTrackLimit = 10;
    private const int RadioSequenceLimit = 20;
    private const int RadioArtistCandidateLimit = 1000;
    private const int RadioDiscoveryCandidateLimit = 300;
    private static readonly TimeSpan RadioArtistHistoryWindow = TimeSpan.FromDays(180);

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

    public async Task<IReadOnlyList<RadioTrack>> GetRadioTracksAsync(
        RadioTrackRequest request,
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        int[] baseTrackIds = request
            .BaseTrackIds.Distinct()
            .TakeLast(RadioSeedTrackLimit)
            .ToArray();
        int[] playedRadioTrackIds = request
            .PlayedRadioTrackIds.Distinct()
            .TakeLast(RadioPlayedTrackLimit)
            .ToArray();
        int[] requestTrackIds =
        [
            .. request.BaseTrackIds,
            .. request.PlayedRadioTrackIds,
            .. request.UpcomingTrackIds,
        ];
        int[] sequenceTrackIds = requestTrackIds
            .Reverse()
            .Distinct()
            .Take(RadioSequenceLimit)
            .Reverse()
            .ToArray();
        int[] excludedTrackIds = requestTrackIds.Distinct().ToArray();
        int[] contextTrackIds =
        [
            .. baseTrackIds.Union(playedRadioTrackIds).Union(sequenceTrackIds),
        ];

        Dictionary<int, RadioTrackInfo> contextTracks = (
            await LoadRadioTrackRowsAsync(
                dbContext.Tracks.AsNoTracking().Where(track => contextTrackIds.Contains(track.Id)),
                false,
                cancellationToken
            )
        ).ToDictionary(row => row.TrackId, ToRadioTrackInfo);
        RadioProfile profile = RadioProfile.Create(
            SelectTracks(contextTracks, baseTrackIds),
            SelectTracks(contextTracks, playedRadioTrackIds)
        );
        int[] artistIds = [.. profile.ArtistWeights.Keys];
        if (artistIds.Length > 0)
            profile = profile.WithRelatedArtists(
                await LoadRadioPartyLinksAsync(artistIds, cancellationToken),
                await LoadRadioCollaborationsAsync(artistIds, cancellationToken)
            );
        int[] relatedArtistIds = [.. profile.RelatedArtistWeights.Keys];

        IQueryable<Track> eligible = dbContext
            .Tracks.AsNoTracking()
            .Where(track =>
                track.ContentType == TrackContentType.Music
                && track.Audios.Any()
                && !excludedTrackIds.Contains(track.Id)
                && track.AlbumTracks.Any(item =>
                    item.AlbumDisc!.Album!.Type != AlbumType.Soundtrack
                )
            );
        if (!request.IncludeInstrumental)
            eligible = eligible.Where(track => track.VersionType != TrackVersionType.Instrumental);

        List<RadioTrackRow> rows = [];
        if (artistIds.Length > 0)
            rows.AddRange(
                await LoadRadioTrackRowsAsync(
                    CreditedTo(eligible, artistIds)
                        .OrderBy(_ => EF.Functions.Random())
                        .Take(RadioArtistCandidateLimit),
                    true,
                    cancellationToken
                )
            );
        if (relatedArtistIds.Length > 0)
            rows.AddRange(
                await LoadRadioTrackRowsAsync(
                    CreditedTo(eligible, relatedArtistIds)
                        .OrderBy(_ => EF.Functions.Random())
                        .Take(RadioArtistCandidateLimit),
                    true,
                    cancellationToken
                )
            );
        rows.AddRange(
            await LoadRadioTrackRowsAsync(
                eligible.OrderBy(_ => EF.Functions.Random()).Take(RadioDiscoveryCandidateLimit),
                true,
                cancellationToken
            )
        );
        rows = rows.Where(row => row.Releases.Count > 0).DistinctBy(row => row.TrackId).ToList();

        int[] candidateTrackIds = [.. rows.Select(row => row.TrackId)];
        var trackPlays = await dbContext
            .ListeningHistoryEntries.AsNoTracking()
            .Where(entry =>
                entry.UserId == userId && candidateTrackIds.Contains(entry.AlbumTrack!.TrackId)
            )
            .GroupBy(entry => entry.AlbumTrack!.TrackId)
            .Select(group => new
            {
                TrackId = group.Key,
                Count = group.Count(),
                LastPlayedAt = group.Max(entry => entry.PlayedAt),
            })
            .ToDictionaryAsync(play => play.TrackId, cancellationToken);

        DateTimeOffset now = DateTimeOffset.UtcNow;
        DateTimeOffset artistHistorySince = now - RadioArtistHistoryWindow;
        Dictionary<int, int> artistPlayCounts = await dbContext
            .ListeningHistoryEntries.AsNoTracking()
            .Where(entry => entry.UserId == userId && entry.PlayedAt >= artistHistorySince)
            .SelectMany(entry =>
                entry.AlbumTrack!.Track!.Credits.Where(credit =>
                    credit.Credit == CreditType.Artist && credit.PartyId != UnknownPartyId
                )
            )
            .GroupBy(credit => credit.PartyId)
            .Select(group => new { PartyId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(play => play.PartyId, play => play.Count, cancellationToken);

        RadioCandidate[] candidates = rows.Select(row =>
            {
                trackPlays.TryGetValue(row.TrackId, out var plays);
                return new RadioCandidate
                {
                    Track = ToRadioTrackInfo(row),
                    Release = RadioCandidate.PickRelease(row.Releases),
                    PlayCount = plays?.Count ?? 0,
                    LastPlayedAt = plays?.LastPlayedAt,
                };
            })
            .ToArray();

        return RadioPlanner.Plan(
            new RadioPlanInput
            {
                Profile = profile,
                Candidates = candidates,
                Sequence = SelectTracks(contextTracks, sequenceTrackIds),
                ArtistPlayCounts = artistPlayCounts,
                Count = request.Count,
                Now = now,
            },
            Random.Shared
        );
    }

    private async Task<IReadOnlyCollection<RadioPartyLink>> LoadRadioPartyLinksAsync(
        int[] artistIds,
        CancellationToken cancellationToken
    )
    {
        var links = await dbContext
            .PartyMemberships.AsNoTracking()
            .Where(membership =>
                artistIds.Contains(membership.PartyId) || artistIds.Contains(membership.MemberId)
            )
            .Select(membership => new
            {
                membership.PartyId,
                membership.MemberId,
                membership.Type,
            })
            .ToListAsync(cancellationToken);

        int[] groupIds = links
            .Where(link =>
                artistIds.Contains(link.MemberId) && link.Type != PartyRelationshipType.VoiceActorOf
            )
            .Select(link => link.PartyId)
            .Distinct()
            .ToArray();
        if (groupIds.Length > 0)
            links.AddRange(
                await dbContext
                    .PartyMemberships.AsNoTracking()
                    .Where(membership =>
                        groupIds.Contains(membership.PartyId)
                        && membership.Type != PartyRelationshipType.VoiceActorOf
                    )
                    .Select(membership => new
                    {
                        membership.PartyId,
                        membership.MemberId,
                        membership.Type,
                    })
                    .ToListAsync(cancellationToken)
            );

        return links
            .Where(link => link.PartyId != UnknownPartyId && link.MemberId != UnknownPartyId)
            .Select(link => new RadioPartyLink(link.PartyId, link.MemberId, link.Type))
            .Distinct()
            .ToArray();
    }

    private async Task<IReadOnlyCollection<RadioCollaboration>> LoadRadioCollaborationsAsync(
        int[] artistIds,
        CancellationToken cancellationToken
    )
    {
        var collaborations = await dbContext
            .TrackCredits.AsNoTracking()
            .Where(credit =>
                credit.Credit == CreditType.Artist && artistIds.Contains(credit.PartyId)
            )
            .SelectMany(credit =>
                credit
                    .Track!.Credits.Where(other =>
                        other.Credit == CreditType.Artist
                        && other.PartyId != UnknownPartyId
                        && !artistIds.Contains(other.PartyId)
                    )
                    .Select(other => new { SeedPartyId = credit.PartyId, other.PartyId })
            )
            .Distinct()
            .ToListAsync(cancellationToken);
        return collaborations
            .Select(item => new RadioCollaboration(item.SeedPartyId, item.PartyId))
            .ToArray();
    }

    private static IQueryable<Track> CreditedTo(IQueryable<Track> tracks, int[] partyIds) =>
        tracks.Where(track =>
            track.Credits.Any(credit =>
                credit.Credit == CreditType.Artist && partyIds.Contains(credit.PartyId)
            )
            || (
                !track.Credits.Any(credit =>
                    credit.Credit == CreditType.Artist && credit.PartyId != UnknownPartyId
                )
                && track.AlbumTracks.Any(item =>
                    item.AlbumDisc!.Album!.Type != AlbumType.Compilation
                    && item.AlbumDisc.Album.Credits.Any(credit =>
                        credit.Credit == CreditType.Artist && partyIds.Contains(credit.PartyId)
                    )
                )
            )
        );

    private static Task<List<RadioTrackRow>> LoadRadioTrackRowsAsync(
        IQueryable<Track> tracks,
        bool eligibleReleasesOnly,
        CancellationToken cancellationToken
    ) =>
        tracks
            .Select(track => new RadioTrackRow
            {
                TrackId = track.Id,
                LanguageId = track.LanguageId,
                ArtistIds = track
                    .Credits.Where(credit =>
                        credit.Credit == CreditType.Artist && credit.PartyId != UnknownPartyId
                    )
                    .Select(credit => credit.PartyId)
                    .ToList(),
                Releases = track
                    .AlbumTracks.Where(item =>
                        !eligibleReleasesOnly || item.AlbumDisc!.Album!.Type != AlbumType.Soundtrack
                    )
                    .Select(item => new RadioRelease
                    {
                        AlbumId = item.AlbumDisc!.AlbumId,
                        AlbumDiscId = item.AlbumDiscId,
                        AlbumType = item.AlbumDisc.Album!.Type,
                        ReleaseDate = item.AlbumDisc.Album.ReleaseDate,
                        AlbumArtistIds = item
                            .AlbumDisc.Album.Credits.Where(credit =>
                                credit.Credit == CreditType.Artist
                                && credit.PartyId != UnknownPartyId
                            )
                            .Select(credit => credit.PartyId)
                            .ToList(),
                    })
                    .ToList(),
            })
            .ToListAsync(cancellationToken);

    private static RadioTrackInfo[] SelectTracks(
        IReadOnlyDictionary<int, RadioTrackInfo> tracks,
        IEnumerable<int> trackIds
    ) => trackIds.Where(tracks.ContainsKey).Select(trackId => tracks[trackId]).ToArray();

    private static RadioTrackInfo ToRadioTrackInfo(RadioTrackRow row) =>
        RadioTrackInfo.Create(row.TrackId, row.LanguageId, row.ArtistIds, row.Releases);

    private sealed class RadioTrackRow
    {
        public required int TrackId { get; init; }
        public int? LanguageId { get; init; }
        public required List<int> ArtistIds { get; init; }
        public required List<RadioRelease> Releases { get; init; }
    }

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
