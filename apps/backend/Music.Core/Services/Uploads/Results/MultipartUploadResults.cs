using Music.Core.Services.Files.Enums;

namespace Music.Core.Services.Uploads.Results;

public sealed record MultipartUploadPartInfo
{
    public required int PartNumber { get; init; }
    public required string Url { get; init; }
}

public sealed record MultipartUploadResults
{
    public required string UploadId { get; init; }
    public required long PartSizeInBytes { get; init; }
    public required IReadOnlyList<MultipartUploadPartInfo> Parts { get; init; }
}

public sealed record PendingOriginalFileResult
{
    public required int FileId { get; init; }
    public required Guid FileObjectId { get; init; }
    public required string FileName { get; init; }
    public required string Blake3Hash { get; init; }
    public required FileProcessingStatus ProcessingStatus { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
}

public sealed record StartUploadResult
{
    public required string Blake3Hash { get; init; }
    public required PendingOriginalFileResult FileObject { get; init; }
    public required MultipartUploadResults MultipartUpload { get; init; }
}
