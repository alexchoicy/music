using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Infrastructure.Entity;

namespace Music.Infrastructure.Data.Configurations;

public class TrackVariantConfiguration : IEntityTypeConfiguration<TrackVariant>
{
    public void Configure(EntityTypeBuilder<TrackVariant> builder)
    {
        builder.HasOne(tv => tv.Track)
            .WithMany(t => t.Variants)
            .HasForeignKey(tv => tv.TrackId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
