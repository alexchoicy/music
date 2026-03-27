using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Music.Core.Models;
using Music.Core.Services.FFmpeg;
using Music.Core.Utils;
using Music.Infrastructure.Utils;

namespace Music.Infrastructure.Services.FFmpeg;

public sealed class MediaFFmpegService(
    ILogger<MediaFFmpegService> logger
) : IMediaFFmpegService
{
    public async Task<bool> ConvertToOpusAsync(string inputPath, string outputPath, CancellationToken cancellationToken = default)
    {
        List<string> args = [
            "-v", "error",
            "-y",
            "-i", inputPath,
            "-c:a", "libopus",
            "-b:a", "96k",
            "-vn",
            outputPath
        ];

        return await ExternalRunner.RunAsync(
            logger,
            "ffmpeg",
            args,
            inputPath,
            outputPath,
            "ffmpeg Opus conversion",
            cancellationToken);
    }

    public async Task<bool> ExtractTextSubtitleToVttAsync(string inputPath, int streamIndex, string outputPath, CancellationToken cancellationToken = default)
    {
        List<string> args = [
            "-v", "error",
            "-y",
            "-i", inputPath,
            "-map", $"0:{streamIndex}",
            "-c:s", "webvtt",
            outputPath
        ];

        return await ExternalRunner.RunAsync(
            logger,
            "ffmpeg",
            args,
            inputPath,
            outputPath,
            "ffmpeg text subtitle extraction",
            cancellationToken);
    }

    public async Task<bool> ExtractPgsSubtitleToSupAsync(string inputPath, int streamIndex, string outputPath, CancellationToken cancellationToken = default)
    {
        List<string> args = [
            "-v", "error",
            "-y",
            "-i", inputPath,
            "-map", $"0:{streamIndex}",
            "-c:s", "copy",
            outputPath
        ];

        return await ExternalRunner.RunAsync(
            logger,
            "ffmpeg",
            args,
            inputPath,
            outputPath,
            "ffmpeg PGS subtitle extraction",
            cancellationToken);
    }


    public async Task<bool> ExtractAttachedPictureAsync(
        string inputPath,
        int streamIndex,
        string outputPath,
        CancellationToken cancellationToken = default)
    {
        List<string> args = [
            "-v", "error",
            "-y",
            "-i", inputPath,
            "-map", $"0:{streamIndex}",
            "-c:v", "copy",
            outputPath
        ];

        return await ExternalRunner.RunAsync(
            logger,
            "ffmpeg",
            args,
            inputPath,
            outputPath,
            "ffmpeg attached picture extraction",
            cancellationToken);
    }


    public async Task<bool> ExtractVideoThumbnailAsync(
        string inputPath,
        int streamIndex,
        string outputPath,
        double? seekSeconds = null,
        CancellationToken cancellationToken = default)
    {
        List<string> args = ["-v", "error"];

        if (seekSeconds is > 0)
        {
            args.Add("-ss");
            args.Add(seekSeconds.Value.ToString("0.###", CultureInfo.InvariantCulture));
        }

        args.AddRange([
            "-y",
            "-i", inputPath,
            "-map", $"0:{streamIndex}",
            "-frames:v", "1",
            "-vf", "scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2:black",
            outputPath
        ]);

        return await ExternalRunner.RunAsync(
            logger,
            "ffmpeg",
            args,
            inputPath,
            outputPath,
            "ffmpeg thumbnail extraction",
            cancellationToken);
    }

    public async Task<bool> ConvertVideoToDashAsync(
        string inputPath,
        string outputDirectory,
        MediaProbeResult probe,
        CancellationToken cancellationToken = default)
    {
        ProbeStream videoStream = probe.Streams?
            .Where(s => string.Equals(s.CodecType, "video", StringComparison.OrdinalIgnoreCase))
            .Where(s => s.Disposition?.AttachedPic != 1)
            .OrderBy(s => s.Index)
            .FirstOrDefault()
            ?? throw new InvalidOperationException("No real video stream found.");

        List<ProbeStream> audioStreams = probe.Streams?
            .Where(s => string.Equals(s.CodecType, "audio", StringComparison.OrdinalIgnoreCase))
            .OrderBy(s => s.Index)
            .ToList()
            ?? [];

        double fps = MediaFiles.ParseFrameRate(videoStream.AvgFrameRate)
            ?? MediaFiles.ParseFrameRate(videoStream.RFrameRate)
            ?? 30.0;

        int gsize = Math.Max(24, (int)Math.Round(fps * 4.0, MidpointRounding.AwayFromZero));

        List<string> args =
        [
            "-hide_banner",
            "-y",
            "-i", inputPath,
            "-map", $"0:{videoStream.Index}"
        ];

        if (audioStreams.Count > 0)
        {
            args.Add("-map");
            args.Add("0:a");
        }

        List<string> videoFilters = [];
        if (IsInterlaced(videoStream.FieldOrder))
        {
            videoFilters.Add("bwdif=mode=send_frame:parity=auto:deint=all");
        }
        videoFilters.Add("format=yuv420p");

        args.AddRange(
        [
            "-vf", string.Join(",", videoFilters),
            "-c:v", "av1_nvenc",
            "-preset", "p6",
            "-rc", "vbr",
            "-cq", "22",
            "-b:v", "0",
            "-g", gsize.ToString(CultureInfo.InvariantCulture),
            "-keyint_min", gsize.ToString(CultureInfo.InvariantCulture),
            "-sc_threshold", "0"
        ]);


        if (audioStreams.Count > 0)
        {
            args.AddRange(
            [
                "-c:a", "libopus",
                "-ar", "48000",
                "-vbr", "on",
                "-application", "audio"
            ]);

            for (int outputAudioIndex = 0; outputAudioIndex < audioStreams.Count; outputAudioIndex++)
            {
                ProbeStream audioStream = audioStreams[outputAudioIndex];
                int channels = MediaFiles.NormalizeChannels(audioStream.Channels);
                int bitrateKbps = GetTargetOpusBitrateKbps(channels);
                string language = MediaFiles.GetLanguage(audioStream);
                string title = MediaFiles.BuildAudioTitle(audioStream);

                args.AddRange(
                [
                    $"-ac:a:{outputAudioIndex}", channels.ToString(CultureInfo.InvariantCulture),
                    $"-b:a:{outputAudioIndex}", $"{bitrateKbps}k",
                    $"-metadata:s:a:{outputAudioIndex}", $"language={language}",
                    $"-metadata:s:a:{outputAudioIndex}", $"title={title}"
                ]);
            }
        }

        args.AddRange(
        [
            "-use_template", "0",
            "-use_timeline", "0",
            "-dash_segment_type", "webm",
            "-seg_duration", "4",
            "-init_seg_name", "init/init-stream$RepresentationID$.$ext$",
            "-media_seg_name", "chunks/chunk-stream$RepresentationID$-$Number%05d$.$ext$",
            "-f", "dash",
            "manifest.mpd"
        ]);

        Directory.CreateDirectory(outputDirectory);
        Directory.CreateDirectory(Path.Combine(outputDirectory, "init"));
        Directory.CreateDirectory(Path.Combine(outputDirectory, "chunks"));

        return await ExternalRunner.RunAsync(
            logger,
            "ffmpeg",
            args,
            inputPath,
            outputDirectory,
            "ffmpeg DASH AV1 conversion",
            cancellationToken,
            workingDirectory: outputDirectory);
    }

    private static int GetTargetOpusBitrateKbps(int channels)
    {
        return channels switch
        {
            <= 1 => 96,
            2 => 128,
            3 or 4 => 160,
            5 or 6 => 192,
            7 or 8 => 256,
            _ => 192
        };
    }

    private static bool IsInterlaced(string? fieldOrder)
    {
        if (string.IsNullOrWhiteSpace(fieldOrder))
        {
            return false;
        }

        return !fieldOrder.Equals("progressive", StringComparison.OrdinalIgnoreCase)
            && !fieldOrder.Equals("unknown", StringComparison.OrdinalIgnoreCase);
    }
}
