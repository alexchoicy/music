using Music.Core.Services.Concerts.Enums;
using Music.Core.Services.Concerts.Requests;
using Music.Core.Services.Concerts.Results;
using Music.Core.Services.Uploads;
using Music.Core.Services.Uploads.Requests;
using Music.Core.Services.Uploads.Results;

namespace Music.Core.Services.Concerts.Results;

public sealed record CreateConcertUploadItemResult
{
    public required string FileName { get; init; }
    public required Guid FileObjectId { get; init; }
    public required string SimpleBlake3Hash { get; init; }
    public required MultipartUploadResults MultipartUploadInfo { get; init; }
}

public sealed record CreateConcertUploadResult
{
    public required string ConcertTitle { get; init; }
    public CreateConcertUploadImageResult? ConcertImage { get; init; }
    public IList<CreateConcertUploadItemResult> Files { get; init; } = [];
}

public sealed record CreateConcertWithoutUploadItemResult
{
    public required string FileName { get; init; }
    public required Guid FileObjectId { get; init; }
    public required string SimpleBlake3Hash { get; init; }
}

public sealed record CreateConcertWithoutUploadResult
{
    public required string Token { get; init; }
    public CreateConcertUploadImageResult? ConcertImage { get; init; }
    public required string ConcertTitle { get; init; }
    public IList<CreateConcertWithoutUploadItemResult> Files { get; init; } = [];
}

public sealed class CreateConcertUploadImageResult
{
    public required string Blake3Hash { get; init; }
    public required string UploadUrl { get; init; }
}
