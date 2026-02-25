using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class AlbumConfiguration : IEntityTypeConfiguration<Album>
{
    public void Configure(EntityTypeBuilder<Album> builder)
    {
        builder.ToTable("Albums");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Id)
            .ValueGeneratedOnAdd();

        builder.Property(a => a.Version)
             .IsRowVersion();

        builder.HasOne<User>()
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
