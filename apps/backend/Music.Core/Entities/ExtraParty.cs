namespace Music.Core.Entities;

public class ExtraParty
{
    public Guid ExtraId { get; set; }
    public Extra? Extra { get; set; }

    public int PartyId { get; set; }
    public Party? Party { get; set; }
}
