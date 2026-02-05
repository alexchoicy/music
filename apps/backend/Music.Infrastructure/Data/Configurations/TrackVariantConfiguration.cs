using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class TrackVariantConfiguration : IEntityTypeConfiguration<TrackVariant>
{
    public void Configure(EntityTypeBuilder<TrackVariant> builder)
    {
        builder.ToTable("TrackVariants");

        builder.HasKey(tv => tv.Id);

        builder.Property(tv => tv.Id)
            .ValueGeneratedOnAdd();

        builder.Property(tv => tv.TrackId)
            .IsRequired();

        builder.HasOne(tv => tv.Track)
            .WithMany(t => t.Variants)
            .HasForeignKey(tv => tv.TrackId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(tv => tv.TrackId);
        builder.HasIndex(tv => tv.VariantType);

        builder.HasIndex(tv => new { tv.TrackId, tv.VariantType }).IsUnique();
    }
}
