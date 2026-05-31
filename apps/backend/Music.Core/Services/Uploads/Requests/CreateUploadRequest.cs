namespace Music.Core.Services.Uploads.Requests;

public sealed record CreateUploadRequest
{
    public required int FileId { get; init; }
}
