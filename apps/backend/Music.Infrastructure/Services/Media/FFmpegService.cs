using Microsoft.Extensions.Logging;
using Music.Core.Media;
using Music.Core.Media.FFmpeg;
using Music.Infrastructure.Utils;

namespace Music.Infrastructure.Services.Media;

public class FFmpegService(ILogger<FFmpegService> logger) : IFFmpegService
{
    public async Task<bool> ConvertToOpusAsync(
        string inputPath,
        string outputPath,
        int targetBitRate,
        AudioMetadataModel metadata,
        string? coverImageBase64 = null,
        CancellationToken cancellationToken = default
    )
    {
        string metadataPath = await FFmpegHelper.CreateFFMetadataFileAsync(
            outputPath,
            metadata,
            coverImageBase64,
            cancellationToken
        );

        try
        {
            List<string> args = [
                "-v",
                "error",
                "-y",
                "-i",
                inputPath,
                "-f",
                "ffmetadata",
                "-i",
                metadataPath,
            ];

            args.AddRange([
                "-map",
                "0:a",
                "-c:a",
                "libopus",
                "-b:a",
                $"{targetBitRate}k",
                "-vn",
            ]);
            FFmpegHelper.AddMetadataMappingArgs(
                args,
                1,
                !string.IsNullOrWhiteSpace(coverImageBase64)
            );

            args.Add(outputPath);

            return await ExternalRunner.RunAsync(
                logger,
                "ffmpeg",
                args,
                inputPath,
                outputPath,
                "ffmpeg Opus conversion",
                cancellationToken
            );
        }
        finally
        {
            FFmpegHelper.DeleteTempMetadataFile(metadataPath, logger);
        }
    }

    public async Task<bool> WriteAudioMetadataAsync(
        string inputPath,
        string outputPath,
        AudioMetadataModel metadata,
        string? coverImagePath = null,
        string? coverImageBase64 = null,
        CancellationToken cancellationToken = default
    )
    {
        coverImagePath = string.IsNullOrWhiteSpace(coverImagePath) ? null : coverImagePath;
        string? metadataCoverImageBase64 = coverImagePath is null ? coverImageBase64 : null;
        string metadataPath = await FFmpegHelper.CreateFFMetadataFileAsync(
            outputPath,
            metadata,
            metadataCoverImageBase64,
            cancellationToken
        );

        try
        {
            List<string> args = ["-v", "error", "-y", "-i", inputPath];

            if (coverImagePath is not null)
            {
                args.AddRange(["-i", coverImagePath]);
            }

            int metadataInputIndex = coverImagePath is null ? 1 : 2;
            args.AddRange(["-f", "ffmetadata", "-i", metadataPath]);
            args.AddRange(["-map", "0:a", "-c:a", "copy"]);

            if (coverImagePath is not null)
            {
                AddCoverArtArgs(args);
            }

            FFmpegHelper.AddMetadataMappingArgs(
                args,
                metadataInputIndex,
                !string.IsNullOrWhiteSpace(metadataCoverImageBase64)
            );
            args.Add(outputPath);

            return await ExternalRunner.RunAsync(
                logger,
                "ffmpeg",
                args,
                inputPath,
                outputPath,
                "ffmpeg audio metadata write",
                cancellationToken
            );
        }
        finally
        {
            FFmpegHelper.DeleteTempMetadataFile(metadataPath, logger);
        }
    }

    private static void AddCoverArtArgs(List<string> args)
    {
        args.AddRange([
            "-map",
            "1:v:0",
            "-c:v",
            "copy",
            "-disposition:v:0",
            "attached_pic",
            "-metadata:s:v:0",
            "title=Album cover",
            "-metadata:s:v:0",
            "comment=Cover (front)",
        ]);
    }
}
