using Music.Core.Enums;

namespace Music.Core.Entities;

public class AlbumCredit
{
    public int Id { get; set; }

    public int AlbumId { get; set; }
    public Album? Album { get; set; }

    public int PartyId { get; set; }
    public Party? Party { get; set; }

    public required AlbumCreditType Credit { get; set; }
}
