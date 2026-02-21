using Music.Core.Models;

namespace Music.Core.Services.Interfaces;

public interface IMigrationService
{
    Task<Opus96BackfillResultModel> QueueMissingOpus96Async(CancellationToken cancellationToken = default);
}
