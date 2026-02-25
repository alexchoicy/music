using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Music.Core.Services.Interfaces;

namespace Music.Infrastructure.Services.Audio;

public sealed class WaveformService(
    ILogger<WaveformService> logger
) : IWaveformService
{
    public async Task<bool> GenerateWaveformJsonAsync(
        string inputPath,
        string outputPath)
    {
        ProcessStartInfo psi = new()
        {
            FileName = "audiowaveform",
            Arguments = $"-i \"{inputPath}\" -o \"{outputPath}\" --pixels-per-second 20 --bits 8",
            RedirectStandardError = true,
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
            logger.LogError(ex, "Failed to start audiowaveform for {InputPath}", inputPath);
            return false;
        }

        string stderr = await process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();

        if (process.ExitCode != 0)
        {
            logger.LogError(
                "audiowaveform failed for {InputPath} (exit {ExitCode}): {Error}",
                inputPath,
                process.ExitCode,
                stderr);

            return false;
        }


        logger.LogInformation(
            "Successfully created {InputPath} → {OutputPath}",
            inputPath,
            outputPath);

        return true;
    }
}
