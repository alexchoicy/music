using Music.Core.Services.Concerts;
using Music.Core.Services.Concerts.Enums;
using Music.Core.Services.Concerts.Requests;
using Music.Core.Services.Concerts.Results;

namespace Music.Core.Entities;

public class ConcertParty
{
    public int ConcertId { get; set; }
    public Concert? Concert { get; set; }

    public int PartyId { get; set; }
    public Party? Party { get; set; }

    public ConcertPartyRole Role { get; set; } = ConcertPartyRole.MainArtist;
}
