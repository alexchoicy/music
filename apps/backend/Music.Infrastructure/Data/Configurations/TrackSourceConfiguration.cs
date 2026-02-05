using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class TrackSourceConfiguration : IEntityTypeConfiguration<TrackSource>
{
    public void Configure(EntityTypeBuilder<TrackSource> builder)
    {
        builder.ToTable("TrackSources");

        builder.HasKey(ts => ts.Id);

        builder.Property(ts => ts.Id)
            .ValueGeneratedOnAdd();

        builder.Property(ts => ts.TrackVariantId)
            .IsRequired();

        builder.Property(ts => ts.FileId)
            .IsRequired();

        builder.HasOne(ts => ts.TrackVariant)
            .WithMany(t => t.Sources)
            .HasForeignKey(ts => ts.TrackVariantId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ts => ts.File)
            .WithMany(f => f.TrackSources)
            .HasForeignKey(ts => ts.FileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<User>()
            .WithMany(user => user.UploadedTrackSources)
            .HasForeignKey(ts => ts.UploadedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(ts => ts.TrackVariantId);
        builder.HasIndex(ts => ts.FileId);
        builder.HasIndex(ts => ts.UploadedByUserId);
        builder.HasIndex(ts => ts.Source);
        builder.HasIndex(ts => ts.Pinned);
        builder.HasIndex(ts => ts.CreatedAt);

        builder.HasIndex(ts => new { ts.TrackVariantId, ts.Pinned, ts.Rank });
        builder.HasIndex(ts => new { ts.TrackVariantId, ts.Source });
    }
}
