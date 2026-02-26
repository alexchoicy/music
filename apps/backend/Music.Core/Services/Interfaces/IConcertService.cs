using Music.Core.Models;

namespace Music.Core.Services.Interfaces;

public interface IConcertService
{
    Task CreateConcertAsync(
        CreateConcertModel concert,
        string userId,
        CancellationToken cancellationToken = default);
}
