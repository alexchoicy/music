using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class ConcertAlbumConfiguration : IEntityTypeConfiguration<ConcertAlbum>
{
    public void Configure(EntityTypeBuilder<ConcertAlbum> builder)
    {
        builder.ToTable("ConcertAlbums");

        builder.HasKey(ca => new { ca.ConcertId, ca.AlbumId });

        builder.Property(ca => ca.ConcertId)
            .IsRequired();

        builder.Property(ca => ca.AlbumId)
            .IsRequired();

        builder.HasOne(ca => ca.Concert)
            .WithMany(c => c.ConcertAlbums)
            .HasForeignKey(ca => ca.ConcertId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ca => ca.Album)
            .WithMany()
            .HasForeignKey(ca => ca.AlbumId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(ca => ca.AlbumId);
    }
}
