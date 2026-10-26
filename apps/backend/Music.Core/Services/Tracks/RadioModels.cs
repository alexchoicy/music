using Music.Core.Services.Albums.Enums;
using Music.Core.Services.Parties.Enums;

namespace Music.Core.Services.Tracks;

public sealed record RadioRelease
{
    public required int AlbumId { get; init; }
    public required int AlbumDiscId { get; init; }
    public required AlbumType AlbumType { get; init; }
    public DateTimeOffset? ReleaseDate { get; init; }
    public required IReadOnlyList<int> AlbumArtistIds { get; init; }
}

public sealed record RadioTrackInfo
{
    public required int TrackId { get; init; }
    public int? LanguageId { get; init; }
    public required IReadOnlyList<int> ArtistIds { get; init; }
    public required IReadOnlyList<int> AlbumIds { get; init; }

    public static RadioTrackInfo Create(
        int trackId,
        int? languageId,
        IReadOnlyCollection<int> trackArtistIds,
        IReadOnlyCollection<RadioRelease> releases
    ) =>
        new()
        {
            TrackId = trackId,
            LanguageId = languageId,
            ArtistIds =
                trackArtistIds.Count > 0
                    ? trackArtistIds.Distinct().ToArray()
                    : releases
                        .Where(release => release.AlbumType != AlbumType.Compilation)
                        .SelectMany(release => release.AlbumArtistIds)
                        .Distinct()
                        .ToArray(),
            AlbumIds = releases.Select(release => release.AlbumId).Distinct().ToArray(),
        };
}

public sealed record RadioCandidate
{
    public required RadioTrackInfo Track { get; init; }
    public required RadioRelease Release { get; init; }
    public int PlayCount { get; init; }
    public DateTimeOffset? LastPlayedAt { get; init; }

    public static RadioRelease PickRelease(IEnumerable<RadioRelease> releases) =>
        releases
            .OrderBy(release => release.AlbumType == AlbumType.Compilation)
            .ThenBy(release => release.ReleaseDate ?? DateTimeOffset.MaxValue)
            .ThenBy(release => release.AlbumId)
            .ThenBy(release => release.AlbumDiscId)
            .First();
}

public sealed record RadioPartyLink(int PartyId, int MemberId, PartyRelationshipType Type);

public sealed record RadioCollaboration(int SeedPartyId, int PartyId);
