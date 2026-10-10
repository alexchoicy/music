namespace Music.Core.Services.ListeningHistory;

public interface IListeningHistoryService
{
    Task<ListeningHistoryPage> GetPageAsync(
        ListeningHistoryPageRequest request,
        string userId,
        CancellationToken cancellationToken = default
    );
    Task RecordAsync(
        RecordListeningHistoryRequest request,
        string userId,
        CancellationToken cancellationToken = default
    );
    Task DeleteEntryAsync(
        long entryId,
        string userId,
        CancellationToken cancellationToken = default
    );
    Task<ListeningHistoryCounts> GetCountsAsync(
        string userId,
        CancellationToken cancellationToken = default
    );
    Task SaveResumePointAsync(
        SaveResumePointRequest request,
        string userId,
        CancellationToken cancellationToken = default
    );
    Task ClearResumePointAsync(
        Guid deviceId,
        string userId,
        CancellationToken cancellationToken = default
    );
}
