using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using Music.Core.Enum;

namespace Music.Infrastructure.Entity;

[Table("TrackCredits")]
[PrimaryKey(nameof(Id))]
public class TrackCredit
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    public required int TrackId { get; set; }
    public Track? Track { get; set; }

    public required int PartyId { get; set; }
    public Party? Party { get; set; }

    public required TrackCreditType Credit { get; set; }
}
