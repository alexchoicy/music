using System.ComponentModel.DataAnnotations;
using Music.Core.Common.Enums;
using Music.Core.Services.Albums.Enums;
using Music.Core.Services.Albums.Requests;
using Music.Core.Services.Albums.Results;
using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;
using Music.Core.Services.Tracks;
using Music.Core.Services.Tracks.Enums;

namespace Music.Core.Services.Albums.Requests;

public sealed class CreateAlbumRequest : IValidatableObject
{
    public required string ClientTempAlbumId { get; init; }
    public required string Title { get; init; }
    public string Description { get; init; } = string.Empty;
    public required AlbumType Type { get; init; }

    public int? LanguageId { get; init; }
    public DateTimeOffset? ReleaseDate { get; init; }

    public required IReadOnlyList<CreditRequest> Credits { get; init; } = [];
    public AlbumImageRequest? Image { get; init; }
    public required IReadOnlyList<AlbumDiscRequest> Discs { get; init; } = [];

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(ClientTempAlbumId))
            yield return new ValidationResult(
                "ClientTempAlbumId is required.",
                [nameof(ClientTempAlbumId)]
            );

        if (string.IsNullOrWhiteSpace(Title))
            yield return new ValidationResult("Album title is required.", [nameof(Title)]);

        if (Discs is null || Discs.Count == 0)
        {
            yield return new ValidationResult("At least one disc is required.", [nameof(Discs)]);
            yield break;
        }

        if (Credits is null)
            yield return new ValidationResult("Album credits are required.", [nameof(Credits)]);

        if (Discs.Any(d => d is null))
            yield return new ValidationResult("Disc entries cannot be null.", [nameof(Discs)]);

        if (
            Discs
                .OfType<AlbumDiscRequest>()
                .GroupBy(d => d.DiscNumber)
                .Any(group => group.Count() > 1)
        )
            yield return new ValidationResult(
                "Disc numbers must be unique per album.",
                [nameof(Discs)]
            );

        foreach (AlbumDiscRequest? disc in Discs)
        {
            if (disc is null)
                continue;

            if (disc.DiscNumber < 1)
                yield return new ValidationResult(
                    "Disc number must be at least 1.",
                    [nameof(Discs)]
                );

            if (disc.Tracks is null || disc.Tracks.Count == 0)
            {
                yield return new ValidationResult(
                    "Each disc must have at least one track.",
                    [nameof(Discs)]
                );
                continue;
            }

            if (disc.Tracks.Any(t => t is null))
                yield return new ValidationResult("Track entries cannot be null.", [nameof(Discs)]);

            if (
                disc
                    .Tracks.OfType<AlbumTrackRequest>()
                    .GroupBy(t => t.TrackNumber)
                    .Any(group => group.Count() > 1)
            )
                yield return new ValidationResult(
                    "Track numbers must be unique per disc.",
                    [nameof(Discs)]
                );

            foreach (AlbumTrackRequest? track in disc.Tracks)
            {
                if (track is null)
                    continue;

                if (string.IsNullOrWhiteSpace(track.ClientTempTrackId))
                    yield return new ValidationResult(
                        "ClientTempTrackId is required.",
                        [nameof(Discs)]
                    );

                if (string.IsNullOrWhiteSpace(track.Title))
                    yield return new ValidationResult("Track title is required.", [nameof(Discs)]);

                if (track.TrackNumber < 0)
                    yield return new ValidationResult(
                        "Track number must be at least 0.",
                        [nameof(Discs)]
                    );

                if (track.Audios is null || track.Audios.Count == 0)
                    yield return new ValidationResult(
                        "Each track must have at least one audio file.",
                        [nameof(Discs)]
                    );

                if (track.Credits is null)
                    yield return new ValidationResult(
                        "Track credits are required.",
                        [nameof(Discs)]
                    );
                foreach (TrackAudioRequest? audio in track.Audios ?? [])
                {
                    if (audio is null)
                    {
                        yield return new ValidationResult(
                            "Audio entries cannot be null.",
                            [nameof(Discs)]
                        );
                        continue;
                    }

                    if (audio.Rank < 0)
                        yield return new ValidationResult(
                            "Audio rank must be at least 0.",
                            [nameof(Discs)]
                        );

                    if (audio.File is null)
                    {
                        yield return new ValidationResult(
                            "Audio file metadata is required.",
                            [nameof(Discs)]
                        );
                        continue;
                    }

                    if (
                        audio.File.MimeType?.StartsWith(
                            "audio/",
                            StringComparison.OrdinalIgnoreCase
                        ) != true
                    )
                        yield return new ValidationResult(
                            "Track files must be audio files.",
                            [nameof(Discs)]
                        );
                }
            }
        }
    }
}

public sealed class AlbumImageRequest
{
    public required string ClientReferenceId { get; init; }
    public required FileRequest File { get; init; }
    public string Description { get; init; } = string.Empty;
    public FileCroppedAreaRequest? CroppedArea { get; init; }
}

public sealed class CreditRequest
{
    public required int PartyId { get; init; }
    public required CreditType Credit { get; init; }
}

public sealed class AlbumDiscRequest
{
    public required int DiscNumber { get; init; }
    public string Subtitle { get; init; } = string.Empty;
    public AlbumImageRequest? Image { get; init; }
    public required IReadOnlyList<AlbumTrackRequest> Tracks { get; init; } = [];
}

public sealed class AlbumTrackRequest
{
    public required string ClientTempTrackId { get; init; }
    public required int TrackNumber { get; init; }
    public required string Title { get; init; }
    public string Description { get; init; } = string.Empty;
    public required int DurationInMs { get; init; }

    public int? LanguageId { get; init; }
    public TrackContentType ContentType { get; init; } = TrackContentType.Music;
    public TrackVersionType VersionType { get; init; } = TrackVersionType.Original;
    public int? BasedOnTrackId { get; init; }

    public required IReadOnlyList<CreditRequest> Credits { get; init; } = [];
    public required IReadOnlyList<TrackAudioRequest> Audios { get; init; } = [];
}

public sealed class TrackAudioRequest
{
    public required FileRequest File { get; init; }
    public int Rank { get; init; } = 0;
    public bool Pinned { get; init; } = false;
    public MediaSource Source { get; set; } = MediaSource.Unknown;
    public string? SourceUrl { get; set; }
}
