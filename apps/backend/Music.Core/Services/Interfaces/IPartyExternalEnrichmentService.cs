namespace Music.Core.Services.Interfaces;

public interface IPartyExternalEnrichmentService
{
    Task EnrichPartyAsync(int partyId, CancellationToken cancellationToken = default);
}
