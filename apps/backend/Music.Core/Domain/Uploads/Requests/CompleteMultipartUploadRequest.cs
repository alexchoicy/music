namespace Music.Core.Domain.Uploads.Requests;

public sealed class CompleteUploadRequest
{
    public required Guid FileObjectId { get; init; }
    public CompleteMultipartUploadRequest? Multipart { get; init; }
}

public sealed class CompleteMultipartUploadRequest
{
    public required string UploadId { get; init; }
    public required IReadOnlyList<CompleteMultipartUploadPart> Parts { get; init; }
}

public sealed class CompleteMultipartUploadPart
{
    public required int PartNumber { get; init; }
    public required string ETag { get; init; }
}
