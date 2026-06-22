using Music.Core.Services.Albums.Enums;
using Music.Core.Services.Albums.Requests;
using Music.Core.Services.Albums.Results;
using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;

namespace Music.Core.Services.Albums;

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
        AlbumListRequest request,
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
