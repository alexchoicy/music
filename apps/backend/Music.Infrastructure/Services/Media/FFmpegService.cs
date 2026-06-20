using System.Globalization;
using Microsoft.Extensions.Logging;
using Music.Core.Common.Utils;
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
            List<string> args =
            [
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

            args.AddRange(["-map", "0:a", "-c:a", "libopus", "-b:a", $"{targetBitRate}k", "-vn"]);
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

    private static List<string> BuildVideoTranscodeArgs(
        string inputPath,
        ProbeStream videoStream,
        IReadOnlyList<ProbeStream> audioStreams,
        int gopSize,
        double segmentDurationSeconds
    )
    {
        string gopSizeString = gopSize.ToString(CultureInfo.InvariantCulture);
        string segmentDuration = segmentDurationSeconds.ToString(
            "0.#########",
            CultureInfo.InvariantCulture
        );

        List<string> args =
        [
            "-hide_banner",
            "-y",
            "-i",
            inputPath,
            "-map",
            $"0:{videoStream.Index}",
            "-sn",
            "-dn",
        ];

        foreach (ProbeStream audioStream in audioStreams)
        {
            args.AddRange(["-map", $"0:{audioStream.Index}"]);
        }

        List<string> videoFilters = [];
        if (FFmpegHelper.IsInterlaced(videoStream.FieldOrder))
        {
            videoFilters.Add("bwdif=mode=send_frame:parity=auto:deint=all");
        }

        bool isHdrVideo = FFmpegHelper.IsHdrVideo(videoStream);
        videoFilters.Add(
            isHdrVideo
                ? "zscale=t=linear:npl=100,format=gbrpf32le,tonemap=tonemap=hable:desat=0,zscale=p=bt709:t=bt709:m=bt709:r=tv,format=yuv420p"
                : "format=yuv420p"
        );

        args.AddRange([
            "-vf",
            string.Join(",", videoFilters),
            "-c:v",
            "av1_nvenc",
            "-preset",
            "p6",
            "-rc",
            "vbr",
            "-cq",
            "22",
            "-b:v",
            "0",
            "-g",
            gopSizeString,
            "-keyint_min",
            gopSizeString,
            "-force_key_frames",
            $"expr:gte(t,n_forced*{segmentDuration})",
            "-forced-idr",
            "1",
        ]);

        if (isHdrVideo)
        {
            args.AddRange([
                "-color_primaries",
                "bt709",
                "-color_trc",
                "bt709",
                "-colorspace",
                "bt709",
                "-color_range",
                "tv",
            ]);
        }

        if (audioStreams.Count > 0)
        {
            args.AddRange([
                "-c:a",
                "libopus",
                "-ar",
                "48000",
                "-vbr",
                "on",
                "-application",
                "audio",
            ]);

            for (
                int outputAudioIndex = 0;
                outputAudioIndex < audioStreams.Count;
                outputAudioIndex++
            )
            {
                ProbeStream audioStream = audioStreams[outputAudioIndex];
                int channels = MediaFiles.NormalizeChannels(audioStream.Channels);
                int bitrateKbps = FFmpegHelper.GetTargetOpusBitrateKbpsForConcert(channels);

                args.AddRange([
                    $"-ac:a:{outputAudioIndex}",
                    channels.ToString(CultureInfo.InvariantCulture),
                    $"-b:a:{outputAudioIndex}",
                    $"{bitrateKbps}k",
                ]);
            }
        }

        ApplyAudioMetadataArgs(args, audioStreams);

        return args;
    }

    private static void ApplyAudioMetadataArgs(
        List<string> args,
        IReadOnlyList<ProbeStream> audioStreams
    )
    {
        for (int outputAudioIndex = 0; outputAudioIndex < audioStreams.Count; outputAudioIndex++)
        {
            ProbeStream audioStream = audioStreams[outputAudioIndex];
            string language = MediaFiles.GetLanguage(audioStream);
            string title = MediaFiles.BuildAudioTitle(audioStream);

            args.AddRange([
                $"-metadata:s:a:{outputAudioIndex}",
                $"language={language}",
                $"-metadata:s:a:{outputAudioIndex}",
                $"title={title}",
            ]);
        }
    }

    private static List<string> BuildDashMuxerArgs(
        string dashSegmentType,
        double? segmentDurationSeconds = null
    )
    {
        List<string> args =
        [
            "-single_file",
            "1",
            "-single_file_name",
            "stream-$RepresentationID$.$ext$",
            "-use_template",
            "0",
            "-use_timeline",
            "0",
            "-dash_segment_type",
            dashSegmentType,
        ];

        if (segmentDurationSeconds is > 0)
        {
            args.AddRange([
                "-seg_duration",
                segmentDurationSeconds.Value.ToString("0.#########", CultureInfo.InvariantCulture),
            ]);
        }

        args.AddRange(["-f", "dash", "manifest.mpd"]);

        return args;
    }

    public async Task<bool> ConvertVideoToAv1DashAsync(
        string inputPath,
        string outputDirectory,
        MediaProbeResult probe,
        CancellationToken cancellationToken = default
    )
    {
        ProbeStream videoStream = ProbeHelper.GetPrimaryVideoStream(probe);
        List<ProbeStream> audioStreams = ProbeHelper.GetAudioStreams(probe);

        FFmpegHelper.GetDashTiming(videoStream, out int gopSize, out double segmentDurationSeconds);

        List<string> args = BuildVideoTranscodeArgs(
            inputPath,
            videoStream,
            audioStreams,
            gopSize,
            segmentDurationSeconds
        );
        args.AddRange(BuildDashMuxerArgs("webm", segmentDurationSeconds));

        Directory.CreateDirectory(outputDirectory);

        return await ExternalRunner.RunAsync(
            logger,
            "ffmpeg",
            args,
            inputPath,
            outputDirectory,
            "ffmpeg AV1 DASH conversion",
            cancellationToken,
            workingDirectory: outputDirectory
        );
    }

    public async Task<bool> RemuxVideoForWebAsync(
        string inputPath,
        string outputPath,
        CancellationToken cancellationToken = default
    )
    {
        List<string> args =
        [
            "-v",
            "error",
            "-y",
            "-i",
            inputPath,
            "-map",
            "0:V:0",
            "-map",
            "0:a:0?",
            "-c",
            "copy",
        ];

        string extension = Path.GetExtension(outputPath);
        if (string.Equals(extension, ".mp4", StringComparison.OrdinalIgnoreCase))
        {
            args.AddRange(["-movflags", "+faststart"]);
        }
        else if (string.Equals(extension, ".webm", StringComparison.OrdinalIgnoreCase))
        {
            args.AddRange(["-cues_to_front", "1"]);
        }

        args.Add(outputPath);

        return await ExternalRunner.RunAsync(
            logger,
            "ffmpeg",
            args,
            inputPath,
            outputPath,
            "ffmpeg web video remux",
            cancellationToken
        );
    }

    public async Task<bool> ExtractTextSubtitleToVttAsync(
        string inputPath,
        int streamIndex,
        string outputPath,
        CancellationToken cancellationToken = default
    )
    {
        List<string> args =
        [
            "-v",
            "error",
            "-y",
            "-i",
            inputPath,
            "-map",
            $"0:{streamIndex}",
            "-c:s",
            "webvtt",
            outputPath,
        ];

        return await ExternalRunner.RunAsync(
            logger,
            "ffmpeg",
            args,
            inputPath,
            outputPath,
            "ffmpeg text subtitle extraction",
            cancellationToken
        );
    }

    public async Task<bool> ExtractPgsSubtitleToSupAsync(
        string inputPath,
        int streamIndex,
        string outputPath,
        CancellationToken cancellationToken = default
    )
    {
        List<string> args =
        [
            "-v",
            "error",
            "-y",
            "-i",
            inputPath,
            "-map",
            $"0:{streamIndex}",
            "-c:s",
            "copy",
            outputPath,
        ];

        return await ExternalRunner.RunAsync(
            logger,
            "ffmpeg",
            args,
            inputPath,
            outputPath,
            "ffmpeg PGS subtitle extraction",
            cancellationToken
        );
    }

    public async Task<bool> ExtractAttachedPictureAsync(
        string inputPath,
        int streamIndex,
        string outputPath,
        CancellationToken cancellationToken = default
    )
    {
        List<string> args =
        [
            "-v",
            "error",
            "-y",
            "-i",
            inputPath,
            "-map",
            $"0:{streamIndex}",
            "-c:v",
            "copy",
            outputPath,
        ];

        return await ExternalRunner.RunAsync(
            logger,
            "ffmpeg",
            args,
            inputPath,
            outputPath,
            "ffmpeg attached picture extraction",
            cancellationToken
        );
    }

    public async Task<bool> ExtractVideoThumbnailAsync(
        string inputPath,
        int streamIndex,
        string outputPath,
        double? seekSeconds = null,
        CancellationToken cancellationToken = default
    )
    {
        List<string> args = ["-v", "error"];

        if (seekSeconds is > 0)
        {
            args.Add("-ss");
            args.Add(seekSeconds.Value.ToString("0.###", CultureInfo.InvariantCulture));
        }

        args.AddRange([
            "-y",
            "-i",
            inputPath,
            "-map",
            $"0:{streamIndex}",
            "-frames:v",
            "1",
            "-vf",
            "scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2:black",
            outputPath,
        ]);

        return await ExternalRunner.RunAsync(
            logger,
            "ffmpeg",
            args,
            inputPath,
            outputPath,
            "ffmpeg thumbnail extraction",
            cancellationToken
        );
    }
}
