using Music.Core.Services.Inbox.Enums;

namespace Music.Core.Entities;

public class InboxItem
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public Guid GroupId { get; set; }
    public InboxGroup? Group { get; set; }

    public int FileId { get; set; }
    public StoredFile? File { get; set; }

    public InboxItemStatus Status { get; set; } = InboxItemStatus.Pending;

    // Drop order inside the group.
    public int Position { get; set; }

    // Raw file tags read at drop time. They are candidate metadata, not identity.
    public string? Title { get; set; }
    public string? Album { get; set; }
    public List<string> Artists { get; set; } = [];
    public List<string> AlbumArtists { get; set; } = [];
    public int? TrackNumber { get; set; }
    public int? TrackTotal { get; set; }
    public int? DiscNumber { get; set; }
    public int? DiscTotal { get; set; }
    public string? Date { get; set; }
    public List<string> Genres { get; set; } = [];

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
