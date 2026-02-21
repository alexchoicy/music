using Microsoft.EntityFrameworkCore;
using Music.Core.Enums;
using Music.Core.Models;
using Music.Core.Services.Interfaces;
using Music.Infrastructure.Data;

namespace Music.Infrastructure.Services.Migrations;

public sealed class MigrationService(
    AppDbContext dbContext,
    IContentService contentService) : IMigrationService
{
    private readonly AppDbContext _dbContext = dbContext;
    private readonly IContentService _contentService = contentService;

    public async Task<Opus96BackfillResultModel> QueueMissingOpus96Async(CancellationToken cancellationToken = default)
    {
        List<Core.Entities.TrackSource> trackSources = await _dbContext.TrackSources
            .AsNoTracking()
            .Include(ts => ts.File)
                .ThenInclude(file => file!.FileObjects)
            .ToListAsync(cancellationToken);

        int scannedTrackSources = trackSources.Count;
        int eligibleTrackSources = 0;

        HashSet<Guid> uniqueOriginalFileObjectIds = [];

        foreach (Core.Entities.TrackSource trackSource in trackSources)
        {
            if (trackSource.File?.Type != FileType.Audio)
            {
                continue;
            }

            List<Core.Entities.FileObject> fileObjects = trackSource.File.FileObjects.ToList();

            if (fileObjects.Count != 1)
            {
                continue;
            }

            Core.Entities.FileObject original = fileObjects[0];

            if (original.Type != FileObjectType.Original || original.FileObjectVariant != FileObjectVariant.Original)
            {
                continue;
            }

            if (original.ProcessingStatus != FileProcessingStatus.Completed)
            {
                continue;
            }

            eligibleTrackSources++;

            if (!uniqueOriginalFileObjectIds.Add(original.Id))
            {
                continue;
            }

            TrackUploadProcessWorkerModel workerModel = new()
            {
                FileObjectId = original.Id,
            };

            _contentService.RunBackgroundProcessAudioUploadFile(workerModel);
        }

        int queuedJobs = uniqueOriginalFileObjectIds.Count;

        return new Opus96BackfillResultModel
        {
            ScannedTrackSources = scannedTrackSources,
            EligibleTrackSources = eligibleTrackSources,
            UniqueOriginalFileObjects = uniqueOriginalFileObjectIds.Count,
            QueuedJobs = queuedJobs,
            SkippedTrackSources = scannedTrackSources - eligibleTrackSources,
        };
    }
}
