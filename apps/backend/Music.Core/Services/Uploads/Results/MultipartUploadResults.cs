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
