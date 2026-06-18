using Music.Core.Media.FFmpeg;
using Music.Core.Services.Files.Enums;

namespace Music.Infrastructure.Services.Media;

public static class FFprobeHelper
{
    public static ProbeStream GetPrimaryVideoStream(MediaProbeResult probeResult, Guid fileObjectId)
    {
        return probeResult
                .Streams?.Where(s =>
                    string.Equals(s.CodecType, "video", StringComparison.OrdinalIgnoreCase)
                )
                .Where(s => s.Disposition?.AttachedPic != 1)
                .OrderBy(s => s.Index)
                .FirstOrDefault()
            ?? throw new InvalidOperationException(
                $"No real video stream found for file object ID {fileObjectId}."
            );
    }

    public static List<ProbeStream> GetAudioStreams(MediaProbeResult probeResult)
    {
        return (probeResult.Streams ?? [])
            .Where(s => string.Equals(s.CodecType, "audio", StringComparison.OrdinalIgnoreCase))
            .OrderBy(s => s.Index)
            .ToList();
    }

    public static (
        string extension,
        string mimeType,
        FileObjectVariant variant
    )? GetSubtitleExtractionPlan(string? codecName)
    {
        string normalizedCodec = (codecName ?? string.Empty).Trim().ToLowerInvariant();

        if (normalizedCodec == "hdmv_pgs_subtitle")
        {
            return ("sup", "application/x-pgs", FileObjectVariant.SubtitleSup);
        }

        if (
            normalizedCodec
            is "webvtt"
                or "subrip"
                or "srt"
                or "ass"
                or "ssa"
                or "mov_text"
                or "text"
        )
        {
            return ("vtt", "text/vtt", FileObjectVariant.SubtitleVtt);
        }

        return null;
    }

    private static string? GetStreamTag(ProbeStream stream, string key)
    {
        if (stream.Tags is null)
        {
            return null;
        }

        foreach ((string tagKey, string value) in stream.Tags)
        {
            if (
                string.Equals(tagKey, key, StringComparison.OrdinalIgnoreCase)
                && !string.IsNullOrWhiteSpace(value)
            )
            {
                return value.Trim();
            }
        }

        return null;
    }

    public static double? GetThumbnailSeekSeconds(double? durationSeconds)
    {
        if (durationSeconds is null || durationSeconds <= 0)
        {
            return 30;
        }

        return Math.Clamp(durationSeconds.Value * 0.1, 30, 300);
    }

    public static (string extension, string mimeType) GetAttachedPictureFormat(
        ProbeStream attachedPictureStream
    )
    {
        string? mimeType = GetStreamTag(attachedPictureStream, "mimetype");
        if (!string.IsNullOrWhiteSpace(mimeType))
        {
            return mimeType switch
            {
                "image/png" => ("png", "image/png"),
                _ => ("jpg", "image/jpeg"),
            };
        }

        return string.Equals(
            attachedPictureStream.CodecName,
            "png",
            StringComparison.OrdinalIgnoreCase
        )
            ? ("png", "image/png")
            : ("jpg", "image/jpeg");
    }

    public static string BuildSubtitleFileName(ProbeStream subtitleStream, string extension)
    {
        string language = GetStreamTag(subtitleStream, "language") ?? "und";
        string suffix = $"stream-{subtitleStream.Index}";

        return $"{language}_{suffix}.{extension}";
    }
}
