using System.Text.Json.Serialization;

namespace Music.Core.Models;

public enum WorkerType
{
    TrackUploadProcess
}

[JsonPolymorphic(TypeDiscriminatorPropertyName = "Type")]
[JsonDerivedType(typeof(TrackUploadProcessWorkerModel), (int)WorkerType.TrackUploadProcess)]
public class WorkerModel
{
}


public class TrackUploadProcessWorkerModel : WorkerModel
{
    public required Guid FileObjectId { get; init; }
}
