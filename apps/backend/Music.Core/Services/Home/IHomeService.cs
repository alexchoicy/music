namespace Music.Core.Services.Home;

public interface IHomeService
{
    Task<HomeOverview> GetOverviewAsync(CancellationToken cancellationToken = default);
}
