using System.ComponentModel.DataAnnotations;
using Music.Core.Services.Albums.Enums;
using Music.Core.Services.Files.Requests;
using Music.Core.Services.Tracks.Enums;

namespace Music.Core.Services.Albums.Requests;

public sealed class UpdateAlbumDetailsRequest : IValidatableObject
{
    public required string Title { get; init; }
    public string Description { get; init; } = string.Empty;
    public required AlbumType Type { get; init; }
    public int? LanguageId { get; init; }
    public DateTimeOffset? ReleaseDate { get; init; }
    public IReadOnlyList<int> ArtistIds { get; init; } = [];
    public required uint Version { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(Title))
            yield return new ValidationResult("Album title is required.", [nameof(Title)]);

        if (ArtistIds is null)
            yield return new ValidationResult("Artists are required.", [nameof(ArtistIds)]);
    }
}

// Exactly one action per request
public sealed class UpdateAlbumCoverRequest : IValidatableObject
{
    // Null targets the album cover, otherwise a disc cover
    public int? AlbumDiscId { get; init; }

    // Replace with a new image (crop optional)
    public AlbumImageRequest? Image { get; init; }

    // Change the crop of the current image
    public FileCroppedAreaRequest? CroppedArea { get; init; }

    // Disc only: use the album cover for this disc
    public bool UseAlbumCover { get; init; }

    // Disc only: remove the disc cover
    public bool Remove { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        int actions =
            (Image is not null ? 1 : 0)
            + (Image is null && CroppedArea is not null ? 1 : 0)
            + (UseAlbumCover ? 1 : 0)
            + (Remove ? 1 : 0);

        if (actions != 1)
            yield return new ValidationResult(
                "Choose exactly one cover action: new image, crop, use album cover or remove."
            );

        if ((UseAlbumCover || Remove) && AlbumDiscId is null)
            yield return new ValidationResult(
                "Using the album cover or removing only applies to disc covers."
            );

        if (
            Image?.File is { } file
            && !file.MimeType.StartsWith("image/", StringComparison.OrdinalIgnoreCase)
        )
            yield return new ValidationResult("Cover must be an image.", [nameof(Image)]);
    }
}

// Full disc/track layout. Every existing disc and track must appear exactly once;
// track numbers follow the list order.
public sealed class UpdateAlbumTracksRequest : IValidatableObject
{
    public required IReadOnlyList<UpdateAlbumDiscRequest> Discs { get; init; } = [];
    public required uint Version { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Discs is null || Discs.Count == 0)
        {
            yield return new ValidationResult("Discs are required.", [nameof(Discs)]);
            yield break;
        }

        List<int> trackIds = Discs.SelectMany(disc => disc.Tracks).Select(t => t.TrackId).ToList();
        if (trackIds.Count != trackIds.Distinct().Count())
            yield return new ValidationResult("A track can only appear once.", [nameof(Discs)]);

        if (Discs.Select(disc => disc.AlbumDiscId).Distinct().Count() != Discs.Count)
            yield return new ValidationResult("A disc can only appear once.", [nameof(Discs)]);

        if (Discs.SelectMany(disc => disc.Tracks).Any(t => string.IsNullOrWhiteSpace(t.Title)))
            yield return new ValidationResult("Track title is required.", [nameof(Discs)]);
    }
}

public sealed class UpdateAlbumDiscRequest
{
    public required int AlbumDiscId { get; init; }
    public string Subtitle { get; init; } = string.Empty;
    public required IReadOnlyList<UpdateAlbumTrackRequest> Tracks { get; init; } = [];
}

public sealed class UpdateAlbumTrackRequest
{
    public required int TrackId { get; init; }
    public required string Title { get; init; }
    public TrackContentType ContentType { get; init; } = TrackContentType.Music;
    public TrackVersionType VersionType { get; init; } = TrackVersionType.Original;
    public int? LanguageId { get; init; }
    public IReadOnlyList<int> ArtistIds { get; init; } = [];
}
