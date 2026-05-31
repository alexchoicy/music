using System.Text.Json.Serialization;

namespace Music.Core.Workers;

public enum WorkerType
{
    TrackUploadProcess,
    PartyInfoEnrichment,
    ConcertUploadProcess,
}

[JsonPolymorphic(TypeDiscriminatorPropertyName = "Type")]
[JsonDerivedType(typeof(TrackUploadProcessWorker), (int)WorkerType.TrackUploadProcess)]
[JsonDerivedType(typeof(PartyInfoEnrichmentWorker), (int)WorkerType.PartyInfoEnrichment)]
[JsonDerivedType(typeof(ConcertUploadProcessWorker), (int)WorkerType.ConcertUploadProcess)]
public abstract class WorkerModel { }

public sealed class TrackUploadProcessWorker : WorkerModel
{
    public required Guid FileObjectId { get; init; }
}

public sealed class PartyInfoEnrichmentWorker : WorkerModel
{
    public required int PartyId { get; init; }
}

public sealed class ConcertUploadProcessWorker : WorkerModel
{
    public required Guid FileObjectId { get; init; }
}
