using Music.Core.Workers;

namespace Music.Core.Entities;

public enum WorkerJobStatus
{
    Pending,
    Processing,
    Completed,
    Failed,
}

public sealed class WorkerJob
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public WorkerType Type { get; set; }
    public required string Payload { get; set; }
    public WorkerJobStatus Status { get; set; } = WorkerJobStatus.Pending;
    public int AttemptCount { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
