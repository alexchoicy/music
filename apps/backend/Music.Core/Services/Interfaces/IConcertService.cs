using Music.Core.Models;

namespace Music.Core.Services.Interfaces;

public interface IConcertService
{
    Task<CreateConcertUploadResult> CreateConcertAsync(
        CreateConcertModel concert,
        string userId,
        CancellationToken cancellationToken = default);

    Task<CreateConcertWithoutUploadResult> CreateConcertWithoutUploadAsync(
        CreateConcertModel concert,
        string userId,
        CancellationToken cancellationToken = default);
}
