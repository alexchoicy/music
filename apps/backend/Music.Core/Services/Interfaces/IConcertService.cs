using Music.Core.Models;

namespace Music.Core.Services.Interfaces;

public interface IConcertService
{
    Task<IReadOnlyList<ConcertListItemModel>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<ConcertDetailsModel> GetByIdAsync(
        int concertId,
        CancellationToken cancellationToken = default);

    Task<CreateConcertUploadResult> CreateConcertAsync(
        CreateConcertModel concert,
        string userId,
        CancellationToken cancellationToken = default);

    Task<CreateConcertWithoutUploadResult> CreateConcertWithoutUploadAsync(
        CreateConcertModel concert,
        string userId,
        CancellationToken cancellationToken = default);
}
