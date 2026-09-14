namespace Music.Core.Services.Parties.Results;

public sealed class UpdatePartyResult
{
    public required int PartyId { get; init; }
    public List<PartyImageUploadResult> Images { get; init; } = [];
}

public sealed class PartyImageUploadResult
{
    public required int ImageId { get; init; }
    public required Guid FileObjectId { get; init; }
    public required string UploadUrl { get; init; }
}
