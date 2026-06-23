using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;

namespace Music.Core.Services.Files;

public sealed class FileObjectDetails
{
    public required Guid Id { get; init; }
    public required string Url { get; init; } = string.Empty;

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
    public int? BitsPerSample { get; init; }
    public decimal? FrameRate { get; init; }
    public int? DurationInMs { get; init; }

    public required DateTimeOffset CreatedAt { get; init; }
    public required DateTimeOffset UpdatedAt { get; init; }
}

public sealed class ImageFileVariants
{
    public FileObjectDetails? Original { get; init; }
    public FileObjectDetails? ImageCover1024x1024 { get; init; }
    public FileObjectDetails? ImageAvatar512x512 { get; init; }
    public FileObjectDetails? ImageBanner1500x500 { get; init; }
    public FileObjectDetails? ImageWide1280x720 { get; init; }
}
