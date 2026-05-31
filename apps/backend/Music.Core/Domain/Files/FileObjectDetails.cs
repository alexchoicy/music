using Music.Core.Domain.Files.Enums;

namespace Music.Core.Domain.Files;

public sealed class FileObjectDetails
{
    public required Guid Id { get; init; }
    public required string Url { get; init; } = string.Empty;

    public required FileObjectType Type { get; init; }
    public required FileObjectVariant Variant { get; init; }

    public required long SizeInBytes { get; init; }
    public required string MimeType { get; init; } = string.Empty;
    public required string Container { get; init; } = string.Empty;
    public required string Extension { get; init; } = string.Empty;
    public string? Codec { get; init; }

    public int? Width { get; init; }
    public int? Height { get; init; }

    public int? AudioSampleRate { get; init; }
    public int? Bitrate { get; init; }
    public decimal? FrameRate { get; init; }
    public int? DurationInMs { get; init; }

    public required DateTimeOffset CreatedAt { get; init; }
    public required DateTimeOffset UpdatedAt { get; init; }
}
