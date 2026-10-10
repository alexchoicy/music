namespace Music.Core.Media.FFmpeg;

public interface IFFmpegService
{
    Task<bool> ConvertToOpusAsync(
        string inputPath,
        string outputPath,
        int targetBitRate,
        AudioMetadataModel metadata,
        string? coverImageBase64 = null, //Since ogg does not support embedded cover image
        CancellationToken cancellationToken = default
    );

    Task<bool> WriteAudioMetadataAsync(
        string inputPath,
        string outputPath,
        AudioMetadataModel metadata,
        string? coverImagePath = null,
        string? coverImageBase64 = null,
        CancellationToken cancellationToken = default
    );

    Task<bool> ConvertVideoToAv1DashAsync(
        string inputPath,
        string outputDirectory,
        MediaProbeResult probe,
        CancellationToken cancellationToken = default
    );

    Task<bool> RemuxVideoForWebAsync(
        string inputPath,
        string outputPath,
        CancellationToken cancellationToken = default
    );

    Task<bool> ExtractTextSubtitleToVttAsync(
        string inputPath,
        int streamIndex,
        string outputPath,
        CancellationToken cancellationToken = default
    );

    Task<bool> ExtractPgsSubtitleToSupAsync(
        string inputPath,
        int streamIndex,
        string outputPath,
        CancellationToken cancellationToken = default
    );

    Task<bool> ExtractAttachedPictureAsync(
        string inputPath,
        int streamIndex,
        string outputPath,
        CancellationToken cancellationToken = default
    );

    Task<bool> ExtractVideoThumbnailAsync(
        string inputPath,
        int streamIndex,
        string outputPath,
        double? seekSeconds = null,
        CancellationToken cancellationToken = default
    );
}
