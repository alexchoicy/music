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

    public async ValueTask QueueWorkerAsync(
        WorkerModel workerModel,
        CancellationToken cancellationToken = default
    )
    {
        using IServiceScope scope = _scopeFactory.CreateScope();
        AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        WorkerJob job = new()
        {
            Type = GetWorkerType(workerModel),
            Payload = JsonSerializer.Serialize(workerModel, typeof(WorkerModel)),
        };

        dbContext.WorkerJobs.Add(job);
        await dbContext.SaveChangesAsync(cancellationToken);
        await _queue.Writer.WriteAsync(job.Id, cancellationToken);
    }

    public async ValueTask<QueuedWorker> DequeueWorkerAsync(CancellationToken cancellationToken)
    {
        while (true)
        {
            Guid jobId = await _queue.Reader.ReadAsync(cancellationToken);

            using IServiceScope scope = _scopeFactory.CreateScope();
            AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            WorkerJob? job = await dbContext.WorkerJobs.FirstOrDefaultAsync(
                workerJob => workerJob.Id == jobId,
                cancellationToken
            );

            if (job is null || job.Status == WorkerJobStatus.Completed)
                continue;

            WorkerModel? workerModel = JsonSerializer.Deserialize<WorkerModel>(job.Payload);
            if (workerModel is null)
            {
                job.Status = WorkerJobStatus.Failed;
                job.ErrorMessage = "Worker payload could not be deserialized.";
                await dbContext.SaveChangesAsync(cancellationToken);
                continue;
            }

            job.Status = WorkerJobStatus.Processing;
            job.AttemptCount += 1;
            job.StartedAt = DateTimeOffset.UtcNow;
            job.ErrorMessage = null;
            await dbContext.SaveChangesAsync(cancellationToken);

            return new QueuedWorker(job.Id, workerModel);
        }
    }

    public async Task RequeueUnfinishedWorkersAsync(CancellationToken cancellationToken = default)
    {
        using IServiceScope scope = _scopeFactory.CreateScope();
        AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        List<WorkerJob> jobs = await dbContext
            .WorkerJobs.Where(job =>
                job.Status == WorkerJobStatus.Pending
                || job.Status == WorkerJobStatus.Processing
                || job.Status == WorkerJobStatus.Failed
            )
            .OrderBy(job => job.CreatedAt)
            .ToListAsync(cancellationToken);

        foreach (WorkerJob job in jobs)
        {
            job.Status = WorkerJobStatus.Pending;
            await _queue.Writer.WriteAsync(job.Id, cancellationToken);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Requeued {WorkerJobCount} unfinished worker jobs.", jobs.Count);
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
        await _queue.Writer.WriteAsync(job.Id, cancellationToken);
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
