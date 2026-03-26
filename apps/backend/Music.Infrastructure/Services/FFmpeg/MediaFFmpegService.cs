using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Music.Core.Models;
using Music.Core.Services.FFmpeg;

namespace Music.Infrastructure.Services.FFmpeg;

public sealed class MediaFFmpegService(
    ILogger<MediaFFmpegService> logger
) : IMediaFFmpegService
{
    public async Task<bool> ConvertToOpusAsync(string inputPath, string outputPath)
    {
        var psi = new ProcessStartInfo
        {
            FileName = "ffmpeg",
            Arguments = $"-v error -i \"{inputPath}\" -c:a libopus -b:a 96k -y \"{outputPath}\"",
            RedirectStandardError = true, // only this matters
            UseShellExecute = false,
            CreateNoWindow = true
        };

        using var process = new Process { StartInfo = psi };

        try
        {
            process.Start();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to start ffmpeg for {InputPath}", inputPath);
            return false;
        }

        string stderr = await process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();

        if (process.ExitCode != 0)
        {
            logger.LogError(
                "ffmpeg failed for {InputPath} (exit {ExitCode}): {Error}",
                inputPath,
                process.ExitCode,
                stderr);

            return false;
        }

        logger.LogInformation(
            "Successfully converted {InputPath} → {OutputPath}",
            inputPath,
            outputPath);

        return true;
    }

    // public async Task<bool> ExtractTextSubtitleToVttAsync(string inputPath, string streamIndex, string outputPath, CancellationToken cancellationToken = default)
    // {

    // }

    // public async Task<bool> ExtractPgsSubtitleToSupAsync(string inputPath, string streamIndex, string outputPath, CancellationToken cancellationToken = default)
    // { }

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

        double fps = ParseFrameRate(videoStream.AvgFrameRate)
            ?? ParseFrameRate(videoStream.RFrameRate)
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
                int channels = NormalizeChannels(audioStream.Channels);
                int bitrateKbps = GetTargetOpusBitrateKbps(channels);
                string language = GetLanguage(audioStream);
                string title = BuildAudioTitle(audioStream);

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

        ProcessStartInfo psi = new()
        {
            FileName = "ffmpeg",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
            WorkingDirectory = outputDirectory
        };

        foreach (string arg in args)
        {
            psi.ArgumentList.Add(arg);
        }

        using Process process = new()
        {
            StartInfo = psi,
            EnableRaisingEvents = true
        };

        try
        {
            if (!process.Start())
            {
                logger.LogError("Failed to start ffmpeg DASH encode for {InputPath}", inputPath);
                return false;
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to start ffmpeg DASH encode for {InputPath}", inputPath);
            return false;
        }

        using CancellationTokenRegistration cancellationRegistration = cancellationToken.Register(() =>
        {
            try
            {
                if (!process.HasExited)
                {
                    process.Kill(entireProcessTree: true);
                }
            }
            catch
            {
            }
        });

        Task<string> stdoutTask = process.StandardOutput.ReadToEndAsync();
        Task<string> stderrTask = process.StandardError.ReadToEndAsync();

        await process.WaitForExitAsync(cancellationToken);

        string stdout = await stdoutTask;
        string stderr = await stderrTask;


        if (process.ExitCode != 0)
        {
            logger.LogError(
                "ffmpeg DASH encode failed for {InputPath} (exit {ExitCode}): {Error}",
                inputPath,
                process.ExitCode,
                string.IsNullOrWhiteSpace(stderr) ? stdout : stderr);

            return false;
        }

        logger.LogInformation(
            "Successfully encoded DASH package for {InputPath} into {OutputDirectory}",
            inputPath,
            outputDirectory);

        return true;

    }

    private static string BuildLayoutName(ProbeStream stream)
    {
        if (!string.IsNullOrWhiteSpace(stream.ChannelLayout))
        {
            return stream.ChannelLayout;
        }

        return NormalizeChannels(stream.Channels) switch
        {
            1 => "Mono",
            2 => "Stereo",
            6 => "5.1",
            8 => "7.1",
            int channelCount => $"{channelCount}ch"
        };
    }

    private static string BuildAudioTitle(ProbeStream stream)
    {

        string codecLong = stream.CodecLongName ?? stream.CodecName ?? "audio";
        string profile = stream.Profile ?? string.Empty;

        string codecLabel = string.IsNullOrWhiteSpace(profile)
            ? codecLong
            : $"{codecLong} - {profile}";

        string layout = BuildLayoutName(stream);

        string incomingTitle = string.Empty;
        if (stream.Tags is not null
            && stream.Tags.TryGetValue("title", out string? title)
            && !string.IsNullOrWhiteSpace(title))
        {
            incomingTitle = title.Trim();
        }

        if (string.IsNullOrWhiteSpace(incomingTitle))
        {
            return $"{layout} ({codecLabel})";
        }

        if (incomingTitle.Contains(codecLabel, StringComparison.OrdinalIgnoreCase))
        {
            return incomingTitle;
        }

        return $"{incomingTitle} ({codecLabel})";

    }

    private static string GetLanguage(ProbeStream stream)
    {
        if (stream.Tags is not null
            && stream.Tags.TryGetValue("language", out string? language)
            && !string.IsNullOrWhiteSpace(language))
        {
            return language.Trim();
        }

        return "und";
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

    private static int NormalizeChannels(int? channels)
    {
        if (channels is null || channels <= 0)
        {
            return 2;
        }

        return channels.Value;
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

    private static double? ParseFrameRate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        string[] parts = value.Split('/', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

        if (parts.Length == 1
            && double.TryParse(parts[0], NumberStyles.Float, CultureInfo.InvariantCulture, out double single))
        {
            return single > 0 ? single : null;
        }

        if (parts.Length == 2
            && double.TryParse(parts[0], NumberStyles.Float, CultureInfo.InvariantCulture, out double num)
            && double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out double den)
            && den != 0)
        {
            double fps = num / den;
            return fps > 0 ? fps : null;
        }

        return null;
    }
}
