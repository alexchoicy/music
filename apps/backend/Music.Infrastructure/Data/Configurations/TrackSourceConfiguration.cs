using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class TrackSourceConfiguration : IEntityTypeConfiguration<TrackSource>
{
    public void Configure(EntityTypeBuilder<TrackSource> builder)
    {
        builder.HasOne(ts => ts.TrackVariant)
            .WithMany(t => t.Sources)
            .HasForeignKey(ts => ts.TrackVariantId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ts => ts.File)
            .WithMany(f => f.TrackSources)
            .HasForeignKey(ts => ts.FileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(ts => ts.UploadedByUser)
            .WithMany(user => user.UploadedTrackSources)
            .HasForeignKey(ts => ts.UploadedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(ts => ts.TrackVariantId);
        builder.HasIndex(ts => ts.FileId);
        builder.HasIndex(ts => ts.UploadedByUserId);
        builder.HasIndex(ts => ts.From);
        builder.HasIndex(ts => ts.Pinned);
        builder.HasIndex(ts => ts.CreatedAt);

        builder.HasIndex(ts => new { ts.TrackVariantId, ts.Pinned, ts.Rank });
        builder.HasIndex(ts => new { ts.TrackVariantId, ts.From });
    }
}
