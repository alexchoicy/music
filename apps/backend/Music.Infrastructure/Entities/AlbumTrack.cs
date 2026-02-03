using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Music.Infrastructure.Entities;

[Table("AlbumTracks")]
[PrimaryKey(nameof(Id))]
public class AlbumTrack
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    public required int AlbumId { get; set; }
    public Album? Album { get; set; }

    public required int TrackId { get; set; }
    public Track? Track { get; set; }

    public int TrackNumber { get; set; } = 1;
    public int DiscNumber { get; set; } = 1;

    [Timestamp]
    public byte[]? Version { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

}
