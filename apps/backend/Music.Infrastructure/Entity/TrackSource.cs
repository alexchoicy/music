using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using Music.Core.Enum;

namespace Music.Infrastructure.Entity;

[Table("TrackSources")]
[PrimaryKey(nameof(Id))]
public class TrackSource
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    public required int TrackVariantId { get; set; }
    public TrackVariant? TrackVariant { get; set; }

    public required int FileId { get; set; }
    public File? File { get; set; }

    // Ranking the audio from source, can be flac, mp3 etc.
    // But they are source not transcoded version by us
    public int Rank { get; set; } = 0;// lower is better

    public bool Pinned { get; set; } = false; // override rank

    public required TrackFrom From { get; set; }

    public required string UploadedByUserId { get; set; }
    public User? UploadedByUser { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
