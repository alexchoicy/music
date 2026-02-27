using Music.Core.Enums;

namespace Music.Core.Models;

public sealed class CreateConcertModel
{
    public required string Title { get; init; }
    public string Description { get; init; } = string.Empty;
    public DateTimeOffset? Date { get; init; }

    public IReadOnlyList<int> LinkedAlbumIds { get; init; } = [];
    public IReadOnlyList<CreateConcertPartyModel> LinkedParties { get; init; } = [];
    public IReadOnlyList<CreateConcertFileModel> Files { get; init; } = [];
}

public sealed class CreateConcertPartyModel
{
    public required int PartyId { get; init; }
    public required ConcertPartyRole Role { get; init; }
}

public sealed class CreateConcertFileModel
{
    public required string Title { get; init; }
    public required ConcertFileType Type { get; init; }
    public int Order { get; init; } = 0;

    public required string SimpleBlake3Hash { get; init; } //First 10mb + last 10mb,
    public required string MimeType { get; init; }
    public required long FileSizeInBytes { get; init; }
    public required string OriginalFileName { get; init; }
}

public sealed record CreateConcertUploadItemResult
{
    public required string FileName { get; init; }
    public required Guid FileObjectId { get; init; }
    public required string SimpleBlake3Hash { get; init; }
    public required MultipartUploadInfo MultipartUploadInfo { get; init; }
}

public sealed record CreateConcertUploadResult
{
    public required string ConcertTitle { get; init; }
    public List<CreateConcertUploadItemResult> Files { get; init; } = [];
}
