using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class AlbumConfiguration : IEntityTypeConfiguration<Album>
{
    public void Configure(EntityTypeBuilder<Album> builder)
    {
        builder.HasOne(album => album.CreatedByUser)
            .WithMany(user => user.CreatedAlbums)
            .HasForeignKey(album => album.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(a => a.NormalizedTitle);
        builder.HasIndex(a => a.Type);
        builder.HasIndex(a => a.LanguageId);
        builder.HasIndex(a => a.CreatedByUserId);
        builder.HasIndex(a => a.ReleaseDate);
        builder.HasIndex(a => a.CreatedAt);
        builder.HasIndex(a => a.UpdatedAt);
    }
}
