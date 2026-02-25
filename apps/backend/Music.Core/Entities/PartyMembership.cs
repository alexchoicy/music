namespace Music.Core.Entities;

public class PartyMembership
{
    public required int PartyId { get; set; }
    public Party? Party { get; set; }

    public required int MemberId { get; set; }
    public Party? Member { get; set; }
}
