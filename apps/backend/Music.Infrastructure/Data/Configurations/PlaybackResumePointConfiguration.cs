using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class PlaybackResumePointConfiguration : IEntityTypeConfiguration<PlaybackResumePoint>
{
    public void Configure(EntityTypeBuilder<PlaybackResumePoint> builder)
    {
        builder.ToTable("PlaybackResumePoints");
        builder.HasKey(point => new { point.UserId, point.DeviceId });
        builder.Property(point => point.DeviceName).HasMaxLength(64);
        builder
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(point => point.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        builder
            .HasOne(point => point.AlbumTrack)
            .WithMany()
            .HasForeignKey(point => point.AlbumTrackId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(point => new { point.UserId, point.UpdatedAt });
    }
}
