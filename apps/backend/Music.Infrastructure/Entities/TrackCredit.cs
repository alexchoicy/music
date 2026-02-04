using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using Music.Core.Enums;

namespace Music.Infrastructure.Entities;

[Table("TrackCredits")]
[PrimaryKey(nameof(Id))]
public class TrackCredit
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    public int TrackId { get; set; }
    public Track? Track { get; set; }

    [Required]
    public int PartyId { get; set; }
    public Party? Party { get; set; }

    public required TrackCreditType Credit { get; set; }
}
