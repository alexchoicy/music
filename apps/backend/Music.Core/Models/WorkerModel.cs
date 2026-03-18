using System.Text.Json.Serialization;

namespace Music.Core.Models;

public enum WorkerType
{
    TrackUploadProcess,
    PartyInfoEnrichment
}

[JsonPolymorphic(TypeDiscriminatorPropertyName = "Type")]
[JsonDerivedType(typeof(TrackUploadProcessWorkerModel), (int)WorkerType.TrackUploadProcess)]
[JsonDerivedType(typeof(PartyInfoEnrichmentWorkerModel), (int)WorkerType.PartyInfoEnrichment)]
public class WorkerModel
{
}


public class TrackUploadProcessWorkerModel : WorkerModel
{
    public required Guid FileObjectId { get; init; }
}

public class PartyInfoEnrichmentWorkerModel : WorkerModel
{
    public required int PartyId { get; init; }
}
