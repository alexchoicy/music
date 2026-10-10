namespace Music.Core.Services.Stats;

public interface IStatsService
{
    Task<LibraryStats> GetLibraryStatsAsync(CancellationToken cancellationToken = default);
}
