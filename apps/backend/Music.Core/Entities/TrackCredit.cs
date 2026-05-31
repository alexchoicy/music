using Music.Core.Domain.Tracks;
using Music.Core.Domain.Tracks.Enums;

namespace Music.Core.Entities;

public class TrackCredit
{
    public int Id { get; set; }

    public int TrackId { get; set; }
    public Track? Track { get; set; }

    public int PartyId { get; set; }
    public Party? Party { get; set; }

    public required TrackCreditType Credit { get; set; }
}
