using Music.Core.Enums;

namespace Music.Core.Entities;

public class ConcertFile
{
    public int Id { get; set; }

    public int ConcertId { get; set; }
    public Concert? Concert { get; set; }

    public int FileId { get; set; }
    public StoredFile? File { get; set; }

    public ConcertFileType Type { get; set; } = ConcertFileType.Performance;

    public required string Title { get; set; }

    public int Order { get; set; } = 0;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
