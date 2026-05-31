using Music.Core.Services.Albums;
using Music.Core.Services.Albums.Enums;
using Music.Core.Services.Albums.Requests;
using Music.Core.Services.Albums.Results;

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
