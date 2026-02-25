using System.Diagnostics;
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
}
