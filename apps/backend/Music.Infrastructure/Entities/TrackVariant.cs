using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using Music.Core.Enums;

namespace Music.Infrastructure.Entities;

[Table("TrackVariants")]
[PrimaryKey(nameof(Id))]
public class TrackVariant
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    public required int TrackId { get; set; }
    public Track? Track { get; set; }

    public TrackVariantType VariantType { get; set; } = TrackVariantType.DEFAULT;

    public ICollection<TrackSource> Sources { get; set; } = [];
}
