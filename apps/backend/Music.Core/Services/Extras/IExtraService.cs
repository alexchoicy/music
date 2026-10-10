using Music.Core.Services.Extras.Requests;
using Music.Core.Services.Extras.Results;

namespace Music.Core.Services.Extras;

public interface IExtraService
{
    Task<IReadOnlyList<ExtraDetails>> GetByAlbumIdAsync(
        int albumId,
        CancellationToken cancellationToken = default
    );

    Task<SaveExtraResult> CreateForAlbumAsync(
        int albumId,
        SaveExtraRequest request,
        string userId,
        CancellationToken cancellationToken = default
    );

    Task<SaveExtraResult> UpdateAsync(
        Guid extraId,
        SaveExtraRequest request,
        string userId,
        CancellationToken cancellationToken = default
    );

    Task DeleteAsync(Guid extraId, CancellationToken cancellationToken = default);
}
