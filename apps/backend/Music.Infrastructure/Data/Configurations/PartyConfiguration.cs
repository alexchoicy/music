using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Infrastructure.Entities;

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

        builder.HasIndex(p => p.NormalizedName);
        builder.HasIndex(p => p.Type);
        builder.HasIndex(p => p.LanguageId);
        builder.HasIndex(p => p.ReleaseDate);
        builder.HasIndex(p => p.CreatedAt);
        builder.HasIndex(p => p.UpdatedAt);

        builder.HasIndex(p => new { p.Type, p.LanguageId });
    }
}
