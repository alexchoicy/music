namespace Music.Api.Dtos.Requests;

public sealed class FileRequest
{
    public required string FileBlake3 { get; init; }
    public required string MimeType { get; init; }
    public required long FileSizeInBytes { get; init; }
    public required string Container { get; init; }
    public required string Extension { get; init; }

    public string? Codec { get; set; }

    public int? Width { get; set; }
    public int? Height { get; set; }

    public int? AudioSampleRate { get; set; }
    public int? Bitrate { get; set; }

    public decimal? FrameRate { get; set; }

    public int? DurationInMs { get; set; }

    public required string OriginalFileName { get; init; }
}

public sealed class FileCroppedArea
{
    public required int Width { get; set; }
    public required int Height { get; set; }
    public required int X { get; set; }
    public required int Y { get; set; }
}
