using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using Music.Core.Enums;

namespace Music.Infrastructure.Entities;

[Table("AlbumCredits")]
[PrimaryKey(nameof(Id))]
public class AlbumCredit
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    public required int AlbumId { get; set; }
    public Album? Album { get; set; }

    public required int PartyId { get; set; }
    public Party? Party { get; set; }

    public required AlbumCreditType Credit { get; set; }
}
