using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Infrastructure.Entity;

namespace Music.Infrastructure.Data.Configurations;

public class AlbumConfiguration : IEntityTypeConfiguration<Album>
{
    public void Configure(EntityTypeBuilder<Album> builder)
    {
        builder.HasOne(album => album.CreatedByUser)
            .WithMany(user => user.CreatedAlbums)
            .HasForeignKey(album => album.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
