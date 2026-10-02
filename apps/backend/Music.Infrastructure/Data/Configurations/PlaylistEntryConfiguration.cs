using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class PlaylistEntryConfiguration : IEntityTypeConfiguration<PlaylistEntry>
{
    public void Configure(EntityTypeBuilder<PlaylistEntry> builder)
    {
        builder.ToTable("PlaylistEntries");
        builder.HasKey(entry => entry.Id);
        builder
            .HasOne(entry => entry.Playlist)
            .WithMany(playlist => playlist.Entries)
            .HasForeignKey(entry => entry.PlaylistId)
            .OnDelete(DeleteBehavior.Cascade);
        builder
            .HasOne(entry => entry.AlbumTrack)
            .WithMany()
            .HasForeignKey(entry => entry.AlbumTrackId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(entry => new { entry.PlaylistId, entry.AlbumTrackId }).IsUnique();
        builder.HasIndex(entry => new { entry.PlaylistId, entry.Position });
    }
}
