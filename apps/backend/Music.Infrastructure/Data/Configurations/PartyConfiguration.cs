using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Infrastructure.Entity;

namespace Music.Infrastructure.Data.Configurations;

public class PartyConfiguration : IEntityTypeConfiguration<Party>
{
    public void Configure(EntityTypeBuilder<Party> builder)
    {
        builder.HasOne(p => p.Language)
            .WithMany()
            .HasForeignKey(p => p.LanguageId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(p => p.Images)
            .WithOne(pi => pi.Party)
            .HasForeignKey(pi => pi.PartyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(p => p.AlbumCredits)
            .WithOne(ac => ac.Party)
            .HasForeignKey(ac => ac.PartyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(p => p.TrackCredits)
            .WithOne(tc => tc.Party)
            .HasForeignKey(tc => tc.PartyId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
