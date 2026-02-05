namespace Music.Core.Models;

public sealed class CreateFileModel
{
    public required string FileBlake3 { get; init; }
    public required string FileSHA1 { get; init; }
    public required string MimeType { get; init; }
    public required long FileSizeInBytes { get; init; }
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

public sealed class FileCroppedAreaModel
{
    public required int Width { get; set; }
    public required int Height { get; set; }
    public required int X { get; set; }
    public required int Y { get; set; }
}
