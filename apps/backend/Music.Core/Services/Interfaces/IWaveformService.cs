namespace Music.Core.Services.Interfaces;

public interface IWaveformService
{
    Task<bool> GenerateWaveformJsonAsync(
        string inputPath,
        string outputPath);
}
