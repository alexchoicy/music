using Music.Core.Services.Albums.Requests;
using Music.Core.Services.Albums.Results;

namespace Music.Core.Services.Albums;

public interface IAlbumEditService
{
    Task<AlbumEditDetails> GetAsync(int albumId, CancellationToken cancellationToken = default);

    Task<AlbumEditDetails> UpdateDetailsAsync(
        int albumId,
        UpdateAlbumDetailsRequest request,
        CancellationToken cancellationToken = default
    );

    Task<UpdateAlbumCoverResult> UpdateCoverAsync(
        int albumId,
        UpdateAlbumCoverRequest request,
        string userId,
        CancellationToken cancellationToken = default
    );

    Task<AlbumEditDetails> UpdateTracksAsync(
        int albumId,
        UpdateAlbumTracksRequest request,
        CancellationToken cancellationToken = default
    );
}
