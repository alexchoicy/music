using System.Text.Json;
using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Music.Core.Entities;
using Music.Core.Workers;
using Music.Infrastructure.Data;

namespace Music.Infrastructure.Workers;

public sealed class BackgroundTaskQueue : IBackgroundTaskQueue
{
    private readonly Channel<Guid> _queue;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<BackgroundTaskQueue> _logger;

    private static WorkerType GetWorkerType(WorkerModel workerModel)
    {
        return workerModel switch
        {
            TrackUploadProcessWorker => WorkerType.TrackUploadProcess,
            PartyInfoEnrichmentWorker => WorkerType.PartyInfoEnrichment,
            ConcertUploadProcessWorker => WorkerType.ConcertUploadProcess,
            ImageUploadProcessWorker => WorkerType.ImageUploadProcess,
            _ => throw new ArgumentOutOfRangeException(nameof(workerModel)),
        };
    }

    public BackgroundTaskQueue(
        IServiceScopeFactory scopeFactory,
        ILogger<BackgroundTaskQueue> logger,
        int capacity = 1000
    )
    {
        _scopeFactory = scopeFactory;
        _logger = logger;

        BoundedChannelOptions options = new(capacity)
        {
            SingleReader = true,
            SingleWriter = false,
            FullMode = BoundedChannelFullMode.Wait,
        };

        _queue = Channel.CreateBounded<Guid>(options);
    }

    public void NotifyWorker(Guid jobId) => _queue.Writer.TryWrite(jobId);

    public async ValueTask QueueWorkerAsync(
        WorkerModel workerModel,
        CancellationToken cancellationToken = default
    )
    {
        using IServiceScope scope = _scopeFactory.CreateScope();
        AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        Guid jobId = StageWorker(workerModel, dbContext);
        await dbContext.SaveChangesAsync(cancellationToken);
        NotifyWorker(jobId);
    }

    public Guid StageWorker(WorkerModel workerModel, IWorkerJobStore store)
    {
        WorkerJob job = new()
        {
            Type = GetWorkerType(workerModel),
            Payload = JsonSerializer.Serialize(workerModel, typeof(WorkerModel)),
        };
        store.AddWorkerJob(job);
        return job.Id;
    }

    public async ValueTask<QueuedWorker> DequeueWorkerAsync(CancellationToken cancellationToken)
    {
        while (true)
        {
            using IServiceScope scope = _scopeFactory.CreateScope();
            AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            if (!_queue.Reader.TryRead(out Guid jobId))
            {
                var pendingId = await dbContext.WorkerJobs
                    .Where(job => job.Status == WorkerJobStatus.Pending)
                    .OrderBy(job => job.CreatedAt).Select(job => (Guid?)job.Id)
                    .FirstOrDefaultAsync(cancellationToken);
                if (pendingId is null)
                {
                    await Task.Delay(TimeSpan.FromSeconds(2), cancellationToken);
                    continue;
                }
                jobId = pendingId.Value;
            }
            WorkerJob? job = await dbContext.WorkerJobs.FirstOrDefaultAsync(
                workerJob => workerJob.Id == jobId,
                cancellationToken
            );

            if (job is null || job.Status != WorkerJobStatus.Pending)
                continue;

            WorkerModel? workerModel = JsonSerializer.Deserialize<WorkerModel>(job.Payload);
            if (workerModel is null)
            {
                job.Status = WorkerJobStatus.Failed;
                job.ErrorMessage = "Worker payload could not be deserialized.";
                await dbContext.SaveChangesAsync(cancellationToken);
                continue;
            }

            int claimed = await dbContext.WorkerJobs
                .Where(candidate => candidate.Id == jobId && candidate.Status == WorkerJobStatus.Pending)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(candidate => candidate.Status, WorkerJobStatus.Processing)
                    .SetProperty(candidate => candidate.AttemptCount, candidate => candidate.AttemptCount + 1)
                    .SetProperty(candidate => candidate.StartedAt, DateTimeOffset.UtcNow)
                    .SetProperty(candidate => candidate.ErrorMessage, (string?)null), cancellationToken);
            if (claimed == 0) continue;

            return new QueuedWorker(job.Id, workerModel);
        }
    }

    public async Task RequeueUnfinishedWorkersAsync(CancellationToken cancellationToken = default)
    {
        using IServiceScope scope = _scopeFactory.CreateScope();
        AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        int count = await dbContext.WorkerJobs
            .Where(job => job.Status == WorkerJobStatus.Processing)
            .ExecuteUpdateAsync(setters => setters.SetProperty(job => job.Status, WorkerJobStatus.Pending), cancellationToken);
        _logger.LogInformation("Recovered {WorkerJobCount} interrupted worker jobs.", count);
    }

    public async Task RetryWorkerAsync(Guid jobId, CancellationToken cancellationToken = default)
    {
        using IServiceScope scope = _scopeFactory.CreateScope();
        AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        WorkerJob? job = await dbContext.WorkerJobs.FirstOrDefaultAsync(
            workerJob => workerJob.Id == jobId,
            cancellationToken
        );

        if (job is null)
            throw new InvalidOperationException($"Worker job {jobId} not found.");

        if (job.Status != WorkerJobStatus.Failed)
            return;

        job.Status = WorkerJobStatus.Pending;
        job.ErrorMessage = null;
        job.CompletedAt = null;
        await dbContext.SaveChangesAsync(cancellationToken);
        NotifyWorker(job.Id);
    }

    public Task CompleteWorkerAsync(Guid jobId, CancellationToken cancellationToken = default)
    {
        return UpdateWorkerAsync(
            jobId,
            job =>
            {
                job.Status = WorkerJobStatus.Completed;
                job.CompletedAt = DateTimeOffset.UtcNow;
                job.ErrorMessage = null;
            },
            cancellationToken
        );
    }

    public Task FailWorkerAsync(
        Guid jobId,
        string errorMessage,
        CancellationToken cancellationToken = default
    )
    {
        return UpdateWorkerAsync(
            jobId,
            job =>
            {
                job.Status = WorkerJobStatus.Failed;
                job.ErrorMessage = errorMessage;
            },
            cancellationToken
        );
    }

    private async Task UpdateWorkerAsync(
        Guid jobId,
        Action<WorkerJob> update,
        CancellationToken cancellationToken
    )
    {
        using IServiceScope scope = _scopeFactory.CreateScope();
        AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        WorkerJob? job = await dbContext.WorkerJobs.FirstOrDefaultAsync(
            workerJob => workerJob.Id == jobId,
            cancellationToken
        );

        if (job is null)
            return;

        update(job);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
