using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Infrastructure.Entity;

namespace Music.Infrastructure.Data.Configurations;

public class AlbumImageConfiguration : IEntityTypeConfiguration<AlbumImage>
{
    public void Configure(EntityTypeBuilder<AlbumImage> builder)
    {
        builder.HasOne(pi => pi.Album)
            .WithMany(p => p.Images)
            .HasForeignKey(pi => pi.AlbumId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(pi => pi.File)
            .WithMany()
            .HasForeignKey(pi => pi.FileId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
