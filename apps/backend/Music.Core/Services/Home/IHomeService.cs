namespace Music.Core.Services.Home;

public interface IHomeService
{
    Task<HomeFeed> GetFeedAsync(string userId, CancellationToken cancellationToken = default);
}
