using Music.Core.Models;

namespace Music.Core.Services.Interfaces;

public interface IAlbumService
{
    Task<AlbumDetailsModel> GetByIdAsync(
        int albumId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CreateAlbumResult>> CreateAlbumAsync(
        IReadOnlyList<CreateAlbumModel> albums,
        string userId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AlbumListItemModel>> GetAllForListAsync(
        CancellationToken cancellationToken = default);
}
