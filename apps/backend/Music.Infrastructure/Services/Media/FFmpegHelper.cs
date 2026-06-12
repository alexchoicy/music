using System.Buffers.Binary;
using System.Text;

namespace Music.Infrastructure.Services.Media;

public static class FFmpegHelper
{
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
}
