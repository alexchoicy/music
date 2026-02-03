using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Infrastructure.Entity;

namespace Music.Infrastructure.Data.Configurations;

public class AlbumTrackConfiguration : IEntityTypeConfiguration<AlbumTrack>
{
    public void Configure(EntityTypeBuilder<AlbumTrack> builder)
    {
        builder.HasOne(at => at.Album)
            .WithMany(album => album.Tracks)
            .HasForeignKey(at => at.AlbumId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(at => at.Track)
            .WithMany(track => track.AlbumTracks)
            .HasForeignKey(at => at.TrackId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
