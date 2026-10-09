namespace Music.Core.Entities;

public class ExtraAsset
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public Guid ExtraId { get; set; }
    public Extra? Extra { get; set; }

    public int FileId { get; set; }
    public StoredFile? File { get; set; }

    // Optional label, e.g. "Back", "Obi", "Special message from X"
    public string? Title { get; set; }

    public int SortOrder { get; set; } = 0;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
