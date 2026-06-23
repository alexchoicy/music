namespace Music.Core.Services.Uploads.Requests;

public sealed record CreateUploadRequest
{
    public required int FileObjectId { get; init; }
}
