
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using Music.Core.Enum;

namespace Music.Infrastructure.Entities;

// Only handle cover
// Other extra content will be handled by
// TODO: AlbumExtraContent
[Table("AlbumImages")]
[PrimaryKey(nameof(Id))]
public class AlbumImage
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    public required int AlbumId { get; set; }
    public Album? Album { get; set; }

    public required int FileId { get; set; }
    public File? File { get; set; }

    public bool IsPrimary { get; set; } = false;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
