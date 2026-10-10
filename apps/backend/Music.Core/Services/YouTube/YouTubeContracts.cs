using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Music.Core.Entities;
using Music.Core.Services.Files.Requests;

namespace Music.Core.Services.YouTube;

public sealed class YouTubeVideoInfo
{
    public required string VideoId { get; init; }
    public required string Title { get; init; }
    public required string WebpageUrl { get; init; }
    public string Channel { get; init; } = string.Empty;
    public string? ChannelId { get; init; }
    public string? ChannelHandle { get; init; }
    public int DurationInMs { get; init; }
    public DateTimeOffset? UploadDate { get; init; }
    public string? ThumbnailUrl { get; init; }
    public IReadOnlyList<YouTubePartySuggestion> SuggestedParties { get; init; } = [];
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum YouTubePartyMatch
{
    // The party has this channel saved as its YouTube external info
    ChannelLink,

    // The channel name matches the party name or one of its aliases
    Name,
}

public sealed class YouTubePartySuggestion
{
    public required int PartyId { get; init; }
    public required string Name { get; init; }
    public required YouTubePartyMatch MatchedBy { get; init; }
}

public sealed class CreateYouTubeCoverRequest : IValidatableObject
{
    public required string Url { get; init; }

    // Becomes both the track and the single's title
    public required string Title { get; init; }

    public IReadOnlyList<int> PartyIds { get; init; } = [];
    public int? LanguageId { get; init; }
    public int? BasedOnTrackId { get; init; }

    // The thumbnail the crop was made against, must be one returned by the info endpoint
    public string? ThumbnailUrl { get; init; }
    public FileCroppedAreaRequest? CroppedArea { get; init; }

    // Saves the video's channel as this party's YouTube external info, must be one of PartyIds
    public int? LinkChannelToPartyId { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(Url))
            yield return new ValidationResult("YouTube URL is required.", [nameof(Url)]);

        if (string.IsNullOrWhiteSpace(Title))
            yield return new ValidationResult("Title is required.", [nameof(Title)]);

        if (CroppedArea is { Width: <= 0 } or { Height: <= 0 })
            yield return new ValidationResult(
                "Cropped area must have a positive size.",
                [nameof(CroppedArea)]
            );

        if (LinkChannelToPartyId is int partyId && !PartyIds.Contains(partyId))
            yield return new ValidationResult(
                "The channel can only be linked to a credited party.",
                [nameof(LinkChannelToPartyId)]
            );
    }
}

public sealed class CreateYouTubeCoverResult
{
    public required int AlbumId { get; init; }
    public required int TrackId { get; init; }
    public required Guid JobId { get; init; }
}

public sealed class YouTubeImportJobStatus
{
    public required Guid JobId { get; init; }
    public required WorkerJobStatus Status { get; init; }
    public string? ErrorMessage { get; init; }
}
