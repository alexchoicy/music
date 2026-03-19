using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class ConcertPartyConfiguration : IEntityTypeConfiguration<ConcertParty>
{
    public void Configure(EntityTypeBuilder<ConcertParty> builder)
    {
        builder.ToTable("ConcertParties");

        builder.HasKey(cp => new { cp.ConcertId, cp.PartyId, cp.Role });

        builder.Property(cp => cp.ConcertId)
            .IsRequired();

        builder.Property(cp => cp.PartyId)
            .IsRequired();

        builder.HasOne(cp => cp.Concert)
            .WithMany(c => c.ConcertParties)
            .HasForeignKey(cp => cp.ConcertId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(cp => cp.Party)
            .WithMany()
            .HasForeignKey(cp => cp.PartyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(cp => cp.PartyId);
        builder.HasIndex(cp => cp.Role);
        builder.HasIndex(cp => new { cp.ConcertId, cp.Role });
    }
}
