using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class TrackAudioConfiguration : IEntityTypeConfiguration<TrackAudio>
{
    public void Configure(EntityTypeBuilder<TrackAudio> builder)
    {
        builder.ToTable("TrackAudios");

        builder.HasKey(ta => ta.Id);

        builder.Property(ta => ta.Id).ValueGeneratedOnAdd();

        builder.Property(ta => ta.TrackId).IsRequired();

        builder.Property(ta => ta.FileId).IsRequired();

        builder
            .HasOne(ta => ta.Track)
            .WithMany(t => t.Audios)
            .HasForeignKey(ta => ta.TrackId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(ta => ta.File)
            .WithMany(f => f.TrackAudios)
            .HasForeignKey(ta => ta.FileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne<User>()
            .WithMany(user => user.UploadedTrackAudios)
            .HasForeignKey(ta => ta.UploadedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(ta => ta.TrackId);
        builder.HasIndex(ta => ta.FileId);
        builder.HasIndex(ta => ta.UploadedByUserId);
        builder.HasIndex(ta => ta.Pinned);
        builder.HasIndex(ta => ta.CreatedAt);

        builder.HasIndex(ta => new
        {
            ta.TrackId,
            ta.Pinned,
            ta.Rank,
        });
        builder.HasIndex(ta => new { ta.TrackId, ta.FileId }).IsUnique();
    }
}
