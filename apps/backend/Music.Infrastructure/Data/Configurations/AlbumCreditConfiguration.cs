using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Infrastructure.Entity;

namespace Music.Infrastructure.Data.Configurations;

public class AlbumCreditConfiguration : IEntityTypeConfiguration<AlbumCredit>
{
    public void Configure(EntityTypeBuilder<AlbumCredit> builder)
    {
        builder.HasOne(ac => ac.Album)
            .WithMany(a => a.Credits)
            .HasForeignKey(ac => ac.AlbumId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ac => ac.Party)
            .WithMany(p => p.AlbumCredits)
            .HasForeignKey(ac => ac.PartyId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
