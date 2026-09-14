using Music.Core.Entities;

namespace Music.Core.Workers;

public interface IWorkerJobStore
{
    void AddWorkerJob(WorkerJob job);
}
