using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using Music.Core.Enum;

namespace Music.Infrastructure.Entity;

// I think this only apply to party cover and banner images
// other extra content will be handled by
// TODO: PartyExtraContent
[Table("PartyImages")]
[PrimaryKey(nameof(Id))]
public class PartyImage
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    public required int PartyId { get; set; }
    public Party? Party { get; set; }

    public required int FileId { get; set; }
    public File? File { get; set; }

    public bool IsPrimary { get; set; } = false;

    public required PartyImageType PartyImageType { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
