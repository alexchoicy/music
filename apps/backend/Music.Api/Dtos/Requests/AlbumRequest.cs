using System.Text.Json.Serialization;
using Music.Core.Enums;

namespace Music.Api.Dtos.Requests;

public sealed class CreateAlbumRequest
{
    public required string Title { get; init; }
    public string Description { get; init; } = string.Empty;

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public required AlbumType Type { get; init; }

    public int? LanguageId { get; init; }
    public DateTimeOffset? ReleaseDate { get; init; }

    public required IReadOnlyList<AlbumCreditRequest> AlbumCredits { get; init; } = [];

    public AlbumImageRequest? AlbumImage { get; init; }

    public required IReadOnlyList<AlbumTrackRequest> Tracks { get; init; } = [];
}

public sealed class AlbumImageRequest
{
    public required FileRequest File { get; init; }
    public string Description { get; init; } = string.Empty;
    public FileCroppedArea? FileCroppedArea { get; init; }
}

public sealed class AlbumCreditRequest
{
    public required int PartyId { get; init; }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public required AlbumCreditType Credit { get; init; }
}

public sealed class AlbumTrackRequest
{
    public required int TrackNumber { get; init; }
    public required int DiscNumber { get; init; }
    public required string Title { get; init; }
    public string Description { get; set; } = string.Empty;
    public bool IsMC { get; init; } = false;

    public required int DurationInMs { get; set; }
    public int? LanguageId { get; init; }
    public required IReadOnlyList<TrackCreditRequest> TrackCredits { get; init; } = [];
    public required IReadOnlyList<TrackVariantRequest> TrackVariants { get; init; } = [];
}

public sealed class TrackCreditRequest
{
    public required int PartyId { get; init; }
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public required TrackCreditType Credit { get; init; }
}

public sealed class TrackVariantRequest
{
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public required TrackVariantType VariantType { get; init; }

    // I think it can be not a list, but just in case. Maybe UI support later
    // all Original
    public required IReadOnlyList<TrackSourceRequest> Sources { get; init; } = [];
}

public sealed class TrackSourceRequest
{
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public required TrackSource Source { get; init; }
    public required FileRequest File { get; init; }
}
