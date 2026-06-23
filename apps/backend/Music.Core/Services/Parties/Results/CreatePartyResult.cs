namespace Music.Core.Services.Parties.Results;

public sealed record CreatePartyResult
{
    public required int PartyId { get; init; }
}
