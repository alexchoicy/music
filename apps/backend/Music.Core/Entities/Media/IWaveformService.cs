namespace Music.Core.Media;

public interface IWaveformService
{
    Task<bool> GenerateWaveformJsonAsync(
        string inputPath,
        string outputPath,
        CancellationToken cancellationToken = default
    );
}
