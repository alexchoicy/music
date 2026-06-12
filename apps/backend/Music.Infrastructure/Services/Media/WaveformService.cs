using Microsoft.Extensions.Logging;
using Music.Core.Media;
using Music.Infrastructure.Utils;

namespace Music.Infrastructure.Services.Media;

public sealed class WaveformService(ILogger<WaveformService> logger) : IWaveformService
{
    public async Task<bool> GenerateWaveformJsonAsync(
        string inputPath,
        string outputPath,
        CancellationToken cancellationToken = default
    )
    {
        string[] args = [
            "-i",
            inputPath,
            "-o",
            outputPath,
            "--pixels-per-second",
            "20",
            "--bits",
            "8",
        ];

        return await ExternalRunner.RunAsync(
            logger,
            "audiowaveform",
            args,
            inputPath,
            outputPath,
            "audiowaveform waveform generation",
            cancellationToken
        );
    }
}
