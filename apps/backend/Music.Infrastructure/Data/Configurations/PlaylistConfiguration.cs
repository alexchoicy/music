using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class PlaylistConfiguration : IEntityTypeConfiguration<Playlist>
{
    public void Configure(EntityTypeBuilder<Playlist> builder)
    {
        builder.ToTable("Playlists");
        builder.HasKey(playlist => playlist.Id);
        builder.Property(playlist => playlist.Name).HasMaxLength(200).IsRequired();
        builder.Property(playlist => playlist.Version).IsRowVersion();
        builder
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(playlist => playlist.OwnerUserId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(playlist => new { playlist.OwnerUserId, playlist.UpdatedAt });
    }
}
