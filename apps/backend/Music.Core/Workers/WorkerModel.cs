using System.Text.Json.Serialization;
using Music.Core.Services.Files.Requests;

namespace Music.Core.Workers;

public enum WorkerType
{
    TrackUploadProcess,
    PartyInfoEnrichment,
    ConcertUploadProcess,
    ImageUploadProcess,
    YouTubeCoverImport,
}

[JsonPolymorphic(TypeDiscriminatorPropertyName = "Type")]
[JsonDerivedType(typeof(TrackUploadProcessWorker), (int)WorkerType.TrackUploadProcess)]
[JsonDerivedType(typeof(PartyInfoEnrichmentWorker), (int)WorkerType.PartyInfoEnrichment)]
[JsonDerivedType(typeof(ConcertUploadProcessWorker), (int)WorkerType.ConcertUploadProcess)]
[JsonDerivedType(typeof(ImageUploadProcessWorker), (int)WorkerType.ImageUploadProcess)]
[JsonDerivedType(typeof(YouTubeCoverImportWorker), (int)WorkerType.YouTubeCoverImport)]
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

public sealed class ImageUploadProcessWorker : WorkerModel
{
    public required Guid FileObjectId { get; init; }
}

public sealed class YouTubeCoverImportWorker : WorkerModel
{
    public required int TrackId { get; init; }
    public required string Url { get; init; }
    public required string UserId { get; init; }
    public string? ThumbnailUrl { get; init; }
    public FileCroppedAreaRequest? CroppedArea { get; init; }
}
