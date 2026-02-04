using Music.Core.Models;

namespace Music.Core.Services.Interfaces;

public interface IAlbumService
{
    Task<IReadOnlyList<CreateAlbumResult>> CreateAlbumAsync(
        IReadOnlyList<CreateAlbumModel> albums,
        string userId,
        CancellationToken cancellationToken = default);
}
