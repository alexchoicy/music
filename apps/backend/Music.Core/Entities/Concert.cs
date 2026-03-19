namespace Music.Core.Entities;

public class Concert
{
    public int Id { get; set; }

    public required string Title { get; set; }

    public string NormalizedTitle { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public DateTimeOffset? Date { get; set; }

    public required string CreatedByUserId { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ConcertCover? Cover { get; set; }

    public ICollection<ConcertAlbum> ConcertAlbums { get; set; } = [];
    public ICollection<ConcertParty> ConcertParties { get; set; } = [];
    public ICollection<ConcertFile> ConcertFiles { get; set; } = [];
}
