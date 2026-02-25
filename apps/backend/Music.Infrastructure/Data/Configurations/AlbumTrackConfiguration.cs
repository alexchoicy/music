using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class AlbumTrackConfiguration : IEntityTypeConfiguration<AlbumTrack>
{
    public void Configure(EntityTypeBuilder<AlbumTrack> builder)
    {
        builder.ToTable("AlbumTracks");

        builder.HasKey(at => at.Id);

        builder.Property(at => at.Id)
            .ValueGeneratedOnAdd();

        builder.Property(at => at.AlbumDiscId).IsRequired();

        builder.Property(at => at.TrackId)
            .IsRequired();

        builder.Property(at => at.Version)
             .IsRowVersion();

        builder.HasOne(at => at.AlbumDisc)
            .WithMany(albumDisc => albumDisc.Tracks)
            .HasForeignKey(at => at.AlbumDiscId)
       .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(at => at.Track)
            .WithMany(track => track.AlbumTracks)
            .HasForeignKey(at => at.TrackId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(at => at.AlbumDiscId); builder.HasIndex(at => at.TrackId);
        builder.HasIndex(at => at.CreatedAt);

        builder.HasIndex(at => new { at.AlbumDiscId, at.TrackNumber });
        builder.HasIndex(at => new { at.AlbumDiscId, at.TrackId }).IsUnique();
    }
}
