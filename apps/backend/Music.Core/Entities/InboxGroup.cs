namespace Music.Core.Entities;

// A batch of files dropped together. Files stay unprocessed until an admin forms albums from them.
public class InboxGroup
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public string? Note { get; set; }

    public required string UploadedByUserId { get; set; }

    public ICollection<InboxItem> Items { get; set; } = [];

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
