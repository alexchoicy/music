namespace Music.Core.Domain.Files;

public sealed class FileRequest
{
    public required string Blake3Hash { get; init; }
    public required string MimeType { get; init; }
    public required long SizeInBytes { get; init; }
    public required string Container { get; init; }
    public required string Extension { get; init; }

    public string? Codec { get; init; }

    public int? Width { get; init; }
    public int? Height { get; init; }

    public int? AudioSampleRate { get; init; }
    public int? Bitrate { get; init; }

    public decimal? FrameRate { get; init; }
    public int? DurationInMs { get; init; }

    public required string OriginalFileName { get; init; }
}

public sealed class FileCroppedAreaRequest
{
    public required int Width { get; init; }
    public required int Height { get; init; }
    public required int X { get; init; }
    public required int Y { get; init; }
}
