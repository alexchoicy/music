using System.Globalization;
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
        List<string> args = ["-v", "error", "-y", "-i", inputPath];

        args.AddRange(["-map", "0:a", "-c:a", "libopus", "-b:a", $"{targetBitRate}k", "-vn"]);
        args.AddRange(["-map_metadata", "-1"]);

        if (!string.IsNullOrWhiteSpace(coverImageBase64))
        {
            args.AddRange(["-metadata:s:a:0", $"METADATA_BLOCK_PICTURE={coverImageBase64}"]);
        }

        ApplyAudioMetadataArgs(args, metadata);

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

    public async Task<bool> WriteAudioMetadataAsync(
        string inputPath,
        string outputPath,
        AudioMetadataModel metadata,
        string? coverImagePath = null,
        string? coverImageBase64 = null,
        CancellationToken cancellationToken = default
    )
    {
        List<string> args = ["-v", "error", "-y", "-i", inputPath];
        coverImagePath = string.IsNullOrWhiteSpace(coverImagePath) ? null : coverImagePath;

        if (coverImagePath is not null)
        {
            args.AddRange(["-i", coverImagePath]);
        }

        args.AddRange(["-map", "0:a", "-c:a", "copy"]);

        if (coverImagePath is not null)
        {
            AddCoverArtArgs(args);
        }
        else if (!string.IsNullOrWhiteSpace(coverImageBase64))
        {
            args.AddRange(["-metadata:s:a:0", $"METADATA_BLOCK_PICTURE={coverImageBase64}"]);
        }

        args.AddRange(["-map_metadata", "-1"]);

        ApplyAudioMetadataArgs(args, metadata);
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

    private static void ApplyAudioMetadataArgs(List<string> args, AudioMetadataModel metadata)
    {
        AddMetadataArg(args, "title", metadata.Title);
        AddMetadataArg(args, "album", metadata.Album);
        AddMetadataArg(args, "artist", JoinMetadataNames(metadata.Artists));
        AddMetadataArg(args, "album_artist", JoinMetadataNames(metadata.AlbumArtists));

        if (metadata.TrackNumber is > 0)
        {
            AddMetadataArg(
                args,
                "track",
                metadata.TrackNumber.Value.ToString(CultureInfo.InvariantCulture)
            );
        }

        if (metadata.DiscNumber is > 0)
        {
            AddMetadataArg(
                args,
                "disc",
                metadata.DiscNumber.Value.ToString(CultureInfo.InvariantCulture)
            );
        }

        if (metadata.ReleaseDate is not null)
        {
            AddMetadataArg(
                args,
                "date",
                metadata.ReleaseDate.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
            );
        }
    }

    private static void AddMetadataArg(List<string> args, string key, string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        args.Add("-metadata");
        args.Add($"{key}={value.Trim()}");
    }

    private static string? JoinMetadataNames(IReadOnlyList<string> names)
    {
        List<string> distinctNames = names
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Select(name => name.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        return distinctNames.Count == 0 ? null : string.Join("; ", distinctNames);
    }
}
