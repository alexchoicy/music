using Music.Core.Models;
using Music.Core.Enums;

namespace Music.Core.Services.Interfaces;

public interface IAlbumService
{
    Task<AlbumSimpleModel> GetSimpleByIdAsync(
        int albumId,
        CancellationToken cancellationToken = default);

    Task<AlbumDetailsModel> GetByIdAsync(
        int albumId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CreateAlbumResult>> CreateAlbumAsync(
        IReadOnlyList<CreateAlbumModel> albums,
        string userId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AlbumListItemModel>> GetAllForListAsync(
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AlbumTrackDownloadItemModel>> GetAlbumDownloadUrlsAsync(
        int albumId,
        FileObjectVariant variant,
        CancellationToken cancellationToken = default);

    Task<AlbumTrackDownloadItemModel> GetTrackDownloadUrlAsync(
        int trackId,
        FileObjectVariant variant,
        CancellationToken cancellationToken = default);
}
