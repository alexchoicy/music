using Music.Core.Services.Uploads;
using Music.Core.Services.Uploads.Requests;
using Music.Core.Services.Uploads.Results;

namespace Music.Core.Services.Files;

public interface IFileUrlService
{
    Task<string> GetFilePlayUrlAsync(
        Guid fileObjectId,
        CancellationToken cancellationToken = default
    );
    Task<string> GetDashManifestAsync(
        Guid fileObjectId,
        CancellationToken cancellationToken = default
    );
}
