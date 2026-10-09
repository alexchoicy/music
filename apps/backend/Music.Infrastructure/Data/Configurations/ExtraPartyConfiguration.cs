using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class ExtraPartyConfiguration : IEntityTypeConfiguration<ExtraParty>
{
    public void Configure(EntityTypeBuilder<ExtraParty> builder)
    {
        builder.ToTable("ExtraParties");

        builder.HasKey(ep => new { ep.ExtraId, ep.PartyId });

        builder.Property(ep => ep.ExtraId).IsRequired();

        builder.Property(ep => ep.PartyId).IsRequired();

        builder
            .HasOne(ep => ep.Party)
            .WithMany()
            .HasForeignKey(ep => ep.PartyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(ep => ep.PartyId);
    }
}
