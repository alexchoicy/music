using Music.Core.Services.Uploads.Results;

namespace Music.Core.Services.Extras.Results;

public sealed class SaveExtraResult
{
    public required ExtraDetails Extra { get; init; }

    // New files that still need their bytes uploaded.
    // Files already in the system are reused and not listed here.
    public IReadOnlyList<ExtraAssetUploadResult> Uploads { get; init; } = [];
}

public sealed class ExtraAssetUploadResult
{
    public required string Blake3Hash { get; init; }
    public required Guid FileObjectId { get; init; }

    // Images: single PUT to the assets bucket
    public string? UploadUrl { get; init; }

    // Other files: multipart upload to the content bucket
    public MultipartUploadResults? MultipartUploadInfo { get; init; }
}
