using Music.Core.Domain.Files.Enums;

namespace Music.Core.Domain.Albums;

public interface IAlbumService
{
    Task<AlbumSummary> GetSummaryByIdAsync(
        int albumId,
        CancellationToken cancellationToken = default
    );

    Task<AlbumDetails> GetByIdAsync(int albumId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CreateAlbumResult>> CreateAlbumAsync(
        IReadOnlyList<CreateAlbumRequest> albums,
        string userId,
        CancellationToken cancellationToken = default
    );

    Task<IReadOnlyList<AlbumListItem>> GetAllForListAsync(
        CancellationToken cancellationToken = default
    );

    Task<IReadOnlyList<AlbumTrackDownloadItem>> GetAlbumDownloadUrlsAsync(
        int albumId,
        FileObjectVariant variant,
        CancellationToken cancellationToken = default
    );

    Task<AlbumTrackDownloadItem> GetTrackDownloadUrlAsync(
        int trackId,
        FileObjectVariant variant,
        CancellationToken cancellationToken = default
    );
}
