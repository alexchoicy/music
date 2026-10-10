using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class ExtraAlbumConfiguration : IEntityTypeConfiguration<ExtraAlbum>
{
    public void Configure(EntityTypeBuilder<ExtraAlbum> builder)
    {
        builder.ToTable("ExtraAlbums");

        builder.HasKey(ea => new { ea.ExtraId, ea.AlbumId });

        builder.Property(ea => ea.ExtraId).IsRequired();

        builder.Property(ea => ea.AlbumId).IsRequired();

        builder
            .HasOne(ea => ea.Album)
            .WithMany()
            .HasForeignKey(ea => ea.AlbumId)
            .OnDelete(DeleteBehavior.Cascade);

        // Removing a disc keeps the extra linked to the album
        builder
            .HasOne(ea => ea.AlbumDisc)
            .WithMany()
            .HasForeignKey(ea => ea.AlbumDiscId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(ea => ea.AlbumId);
        builder.HasIndex(ea => ea.AlbumDiscId);
    }
}
