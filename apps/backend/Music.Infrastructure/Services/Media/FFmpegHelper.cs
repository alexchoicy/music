using System.Buffers.Binary;
using System.Globalization;
using System.Text;
using Microsoft.Extensions.Logging;
using Music.Core.Common.Utils;
using Music.Core.Media;
using Music.Core.Media.FFmpeg;

namespace Music.Infrastructure.Services.Media;

public static class FFmpegHelper
{
    private static readonly Encoding FFMetadataEncoding = new UTF8Encoding(
        encoderShouldEmitUTF8Identifier: false
    );

    private static void WriteUInt32BE(Stream stream, uint value)
    {
        Span<byte> buffer = stackalloc byte[4];
        BinaryPrimitives.WriteUInt32BigEndian(buffer, value);
        stream.Write(buffer);
    }

    //Used for ogg
    public static async Task<string?> ConvertImageToBase64BlockImageAsync(
        string? imagePath,
        string? mimeType,
        CancellationToken cancellationToken = default
    )
    {
        if (string.IsNullOrWhiteSpace(imagePath) || string.IsNullOrWhiteSpace(mimeType))
        {
            return null;
        }

        byte[] imageBytes = await File.ReadAllBytesAsync(imagePath, cancellationToken);

        using MemoryStream stream = new();

        WriteUInt32BE(stream, 3);
        byte[] mimeBytes = Encoding.ASCII.GetBytes(mimeType.Trim());
        WriteUInt32BE(stream, (uint)mimeBytes.Length);
        stream.Write(mimeBytes);
        WriteUInt32BE(stream, 0);
        WriteUInt32BE(stream, 0);
        WriteUInt32BE(stream, 0);
        WriteUInt32BE(stream, 0);
        WriteUInt32BE(stream, 0);

        WriteUInt32BE(stream, (uint)imageBytes.Length);
        stream.Write(imageBytes);

        return Convert.ToBase64String(stream.ToArray());
    }

    public static async Task<string> CreateFFMetadataFileAsync(
        string outputPath,
        AudioMetadataModel metadata,
        string? coverImageBase64,
        CancellationToken cancellationToken = default
    )
    {
        StringBuilder builder = new();
        builder.AppendLine(";FFMETADATA1");
        AppendAudioMetadata(builder, metadata);

        if (!string.IsNullOrWhiteSpace(coverImageBase64))
        {
            builder.AppendLine("[STREAM]");
            AppendMetadataLine(builder, "METADATA_BLOCK_PICTURE", coverImageBase64);
        }

        string metadataPath = Path.Combine(
            Path.GetDirectoryName(outputPath) ?? Path.GetTempPath(),
            $"metadata_{Guid.NewGuid():N}.ffmetadata"
        );

        try
        {
            await File.WriteAllTextAsync(
                metadataPath,
                builder.ToString(),
                FFMetadataEncoding,
                cancellationToken
            );
        }
        catch
        {
            TryDeleteTempMetadataFile(metadataPath, null);
            throw;
        }

        return metadataPath;
    }

    public static void AddMetadataMappingArgs(
        List<string> args,
        int metadataInputIndex,
        bool hasStreamMetadata
    )
    {
        args.AddRange(["-map_metadata", "-1"]);
        args.AddRange(["-map_metadata", $"{metadataInputIndex}:g"]);

        if (hasStreamMetadata)
        {
            args.AddRange(["-map_metadata:s:a:0", $"{metadataInputIndex}:s:0"]);
        }
    }

    public static void DeleteTempMetadataFile(string metadataPath, ILogger logger)
    {
        TryDeleteTempMetadataFile(metadataPath, logger);
    }

    private static void AppendAudioMetadata(StringBuilder builder, AudioMetadataModel metadata)
    {
        AppendMetadataLine(builder, "title", metadata.Title);
        AppendMetadataLine(builder, "album", metadata.Album);
        AppendMetadataLine(builder, "artist", JoinMetadataNames(metadata.Artists));
        AppendMetadataLine(builder, "album_artist", JoinMetadataNames(metadata.AlbumArtists));

        if (metadata.TrackNumber is > 0)
        {
            AppendMetadataLine(
                builder,
                "track",
                metadata.TrackNumber.Value.ToString(CultureInfo.InvariantCulture)
            );
        }

        if (metadata.DiscNumber is > 0)
        {
            AppendMetadataLine(
                builder,
                "disc",
                metadata.DiscNumber.Value.ToString(CultureInfo.InvariantCulture)
            );
        }

        if (metadata.ReleaseDate is not null)
        {
            AppendMetadataLine(
                builder,
                "date",
                metadata.ReleaseDate.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
            );
        }
    }

    private static void AppendMetadataLine(StringBuilder builder, string key, string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        builder.Append(key);
        builder.Append('=');
        builder.AppendLine(EscapeFFMetadataValue(value.Trim()));
    }

    private static string EscapeFFMetadataValue(string value)
    {
        StringBuilder escaped = new(value.Length);

        for (int i = 0; i < value.Length; i++)
        {
            char c = value[i];

            switch (c)
            {
                case '\\':
                case '=':
                case ';':
                case '#':
                    escaped.Append('\\');
                    escaped.Append(c);
                    break;
                case '\r':
                    if (i + 1 < value.Length && value[i + 1] == '\n')
                    {
                        i++;
                    }
                    escaped.Append("\\\n");
                    break;
                case '\n':
                    escaped.Append("\\\n");
                    break;
                default:
                    escaped.Append(c);
                    break;
            }
        }

        return escaped.ToString();
    }

    private static void TryDeleteTempMetadataFile(string metadataPath, ILogger? logger)
    {
        try
        {
            File.Delete(metadataPath);
        }
        catch (Exception ex)
        {
            logger?.LogWarning(
                ex,
                "Failed to delete temporary FFmpeg metadata file {MetadataPath}",
                metadataPath
            );
        }
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

    public static int GetTargetOpusBitrateKbpsForAudio(int channels)
    {
        return channels switch
        {
            1 => 64,
            2 => 96,
            3 or 4 => 160,
            5 or 6 => 192,
            7 or 8 => 320,
            _ => Math.Min(channels * 48, 510),
        };
    }

    public static int GetTargetOpusBitrateKbpsForConcert(int channels)
    {
        return channels switch
        {
            <= 1 => 96,
            2 => 128,
            3 or 4 => 192,
            5 or 6 => 256,
            7 or 8 => 384,
            _ => Math.Min(channels * 64, 510),
        };
    }

    public static bool IsInterlaced(string? fieldOrder)
    {
        if (string.IsNullOrWhiteSpace(fieldOrder))
        {
            return false;
        }

        return !fieldOrder.Equals("progressive", StringComparison.OrdinalIgnoreCase)
            && !fieldOrder.Equals("unknown", StringComparison.OrdinalIgnoreCase);
    }

    private const double DashSegmentDurationSeconds = 4.0;

    public static void GetDashTiming(
        ProbeStream videoStream,
        out int gopSize,
        out double segmentDurationSeconds
    )
    {
        double fps =
            MediaFiles.ParseFrameRate(videoStream.AvgFrameRate)
            ?? MediaFiles.ParseFrameRate(videoStream.RFrameRate)
            ?? 30.0;

        gopSize = Math.Max(
            24,
            (int)Math.Round(fps * DashSegmentDurationSeconds, MidpointRounding.AwayFromZero)
        );
        segmentDurationSeconds = gopSize / fps;
    }
}
