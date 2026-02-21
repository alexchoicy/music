namespace Music.Api.Dtos.Requests;

public sealed class TrackUploadProcessTestRequest
{
    public required Guid FileObjectId { get; init; }
    public required int TrackSourceId { get; init; }
}
