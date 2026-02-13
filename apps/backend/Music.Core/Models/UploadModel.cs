namespace Music.Core.Models;

public sealed record CreateAlbumImageUploadItemResult
{
    public required string Blake3Id { get; init; }
    public required string FileName { get; init; }
    public required string UploadUrl { get; init; }
}

public sealed record CreateAlbumUploadResult
{
    public required string AlbumTitle { get; init; }
    public CreateAlbumImageUploadItemResult? AlbumImage { get; set; }
    public List<CreateAlbumTrackUploadItemResult> Tracks { get; set; } = [];
}

public sealed record CreateAlbumTrackUploadItemResult
{
    public required string Blake3Id { get; init; }
    public required string FileName { get; init; }
    public required MultipartUploadInfo MultipartUploadInfo { get; init; }
}


public sealed record MultipartUploadPartInfo
{
    public required int PartNumber { get; init; }
    public required string Url { get; init; }
}

public sealed record MultipartUploadInfo
{
    public required string UploadId { get; init; }
    public required long PartSizeInBytes { get; init; }
    public required IReadOnlyList<MultipartUploadPartInfo> Parts { get; init; }
}


public sealed class CompleteMultipartUploadRequest
{
    public required string Blake3Id { get; init; }
    public required string UploadId { get; init; }
    public required List<CompleteMultipartUploadPart> Parts { get; init; }
}

public sealed class CompleteMultipartUploadPart
{
    public required int PartNumber { get; init; }
    public required string ETag { get; init; }
}
