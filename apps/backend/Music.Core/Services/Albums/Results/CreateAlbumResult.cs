using Music.Core.Services.Albums.Enums;
using Music.Core.Services.Albums.Requests;
using Music.Core.Services.Albums.Results;
using Music.Core.Services.Uploads;
using Music.Core.Services.Uploads.Requests;
using Music.Core.Services.Uploads.Results;

namespace Music.Core.Services.Albums.Results;

public sealed record CreateAlbumResult
{
    public required string ClientTempAlbumId { get; init; }
    public required string AlbumTitle { get; init; }
    public bool IsSuccess { get; init; }
    public string? ErrorMessage { get; init; }
    public CreateAlbumUploadResult? Upload { get; init; }

    public static CreateAlbumResult Success(
        string clientTempAlbumId,
        string title,
        CreateAlbumUploadResult upload
    ) =>
        new()
        {
            ClientTempAlbumId = clientTempAlbumId,
            AlbumTitle = title,
            IsSuccess = true,
            Upload = upload,
        };

    public static CreateAlbumResult Failure(
        string clientTempAlbumId,
        string title,
        string errorMessage
    ) =>
        new()
        {
            ClientTempAlbumId = clientTempAlbumId,
            AlbumTitle = title,
            IsSuccess = false,
            ErrorMessage = errorMessage,
        };
}

public sealed record CreateAlbumUploadResult
{
    public required string AlbumTitle { get; init; }
    public List<CreateAlbumImageUploadItemResult> Images { get; set; } = [];
    public List<CreateAlbumTrackUploadItemResult> Tracks { get; set; } = [];
}

public sealed record CreateAlbumImageUploadItemResult
{
    public required string ClientReferenceId { get; init; }
    public int? DiscNumber { get; init; }
    public required Guid FileObjectId { get; init; }
    public required string Blake3Hash { get; init; }
    public required string FileName { get; init; }
    public required string UploadUrl { get; init; }
}

public sealed record CreateAlbumTrackUploadItemResult
{
    public required Guid FileObjectId { get; init; }
    public required string Blake3Hash { get; init; }
    public required string FileName { get; init; }
    public required MultipartUploadResults MultipartUploadInfo { get; init; }
}
