namespace Music.Core.Domain.Uploads.Requests;

public sealed record CreateUploadRequest
{
    public required int FileId { get; init; }
}
