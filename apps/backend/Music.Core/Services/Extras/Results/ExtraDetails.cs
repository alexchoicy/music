using Music.Core.Services.Extras.Enums;
using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;

namespace Music.Core.Services.Extras.Results;

public sealed class ExtraDetails
{
    public required Guid ExtraId { get; init; }
    public required string Title { get; init; }
    public required string Description { get; init; }
    public required ExtraCategory Category { get; init; }
    public required MediaSource Source { get; init; }

    public Guid? CoverAssetId { get; init; }
    public FileCroppedAreaRequest? CoverCroppedArea { get; init; }

    public required uint Version { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    public required DateTimeOffset UpdatedAt { get; init; }

    public IReadOnlyList<ExtraAssetDetails> Assets { get; init; } = [];
}

public sealed class ExtraAssetDetails
{
    public required Guid AssetId { get; init; }
    public string? Title { get; init; }
    public required int SortOrder { get; init; }

    public required FileType FileType { get; init; }
    public required string OriginalFileName { get; init; }
    public required FileProcessingStatus ProcessingStatus { get; init; }

    // Images: asset URLs. Other files: API URL that resolves to a presigned URL.
    public FileObjectDetails? Original { get; init; }
    public FileObjectDetails? Preview { get; init; }
    public FileObjectDetails? Thumbnail { get; init; }
}
