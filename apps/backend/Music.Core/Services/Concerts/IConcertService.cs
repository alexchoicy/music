using Music.Core.Services.Concerts.Enums;
using Music.Core.Services.Concerts.Requests;
using Music.Core.Services.Concerts.Results;
namespace Music.Core.Services.Concerts;

public interface IConcertService
{
    Task<IReadOnlyList<ConcertListItem>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<ConcertDetails> GetByIdAsync(int concertId, CancellationToken cancellationToken = default);

    Task<CreateConcertUploadResult> CreateConcertAsync(
        CreateConcertRequest concert,
        string userId,
        CancellationToken cancellationToken = default
    );

    Task<CreateConcertWithoutUploadResult> CreateConcertWithoutUploadAsync(
        CreateConcertRequest concert,
        string userId,
        CancellationToken cancellationToken = default
    );
}
