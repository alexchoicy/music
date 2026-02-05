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

        builder.Property(at => at.AlbumId)
            .IsRequired();

        builder.Property(at => at.TrackId)
            .IsRequired();

        builder.Property(at => at.Version)
             .IsRowVersion();

        builder.HasOne(at => at.Album)
            .WithMany(album => album.Tracks)
            .HasForeignKey(at => at.AlbumId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(at => at.Track)
            .WithMany(track => track.AlbumTracks)
            .HasForeignKey(at => at.TrackId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(at => at.AlbumId);
        builder.HasIndex(at => at.TrackId);
        builder.HasIndex(at => at.CreatedAt);

        builder.HasIndex(at => new { at.AlbumId, at.DiscNumber, at.TrackNumber });
        builder.HasIndex(at => new { at.AlbumId, at.TrackId }).IsUnique();
    }
}
