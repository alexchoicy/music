using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Infrastructure.Entity;

namespace Music.Infrastructure.Data.Configurations;

public class TrackCreditConfiguration : IEntityTypeConfiguration<TrackCredit>
{
    public void Configure(EntityTypeBuilder<TrackCredit> builder)
    {
        builder.HasOne(tc => tc.Track)
            .WithMany(t => t.Credits)
            .HasForeignKey(tc => tc.TrackId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(tc => tc.Party)
            .WithMany(p => p.TrackCredits)
            .HasForeignKey(tc => tc.PartyId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
