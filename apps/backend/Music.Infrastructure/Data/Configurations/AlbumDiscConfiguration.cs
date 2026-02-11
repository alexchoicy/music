using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class AlbumDiscConfiguration : IEntityTypeConfiguration<AlbumDisc>
{
    public void Configure(EntityTypeBuilder<AlbumDisc> builder)
    {
        builder.ToTable("AlbumDiscs");

        builder.HasKey(ad => ad.Id);

        builder.Property(ad => ad.Id)
            .ValueGeneratedOnAdd();

        builder.Property(ad => ad.AlbumId)
            .IsRequired();

        builder.Property(ad => ad.Subtitle)
            .HasMaxLength(250);

        builder.Property(ad => ad.Version)
            .IsRowVersion();

        builder.HasOne(ad => ad.Album)
            .WithMany(album => album.Discs)
            .HasForeignKey(ad => ad.AlbumId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(ad => ad.AlbumId);
        builder.HasIndex(ad => new { ad.AlbumId, ad.DiscNumber }).IsUnique();
    }
}
