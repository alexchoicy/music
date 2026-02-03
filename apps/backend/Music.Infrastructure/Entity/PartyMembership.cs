using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Music.Infrastructure.Entity;

[Table("PartyMemberships")]
[PrimaryKey(nameof(PartyId), nameof(MemberId))]
public class PartyMembership
{
    public required int PartyId { get; set; }
    public Party? Party { get; set; }

    public required int MemberId { get; set; }
    public Party? Member { get; set; }
}
