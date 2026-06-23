using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class AlbumImageConfiguration : IEntityTypeConfiguration<AlbumImage>
{
    public void Configure(EntityTypeBuilder<AlbumImage> builder)
    {
        builder.ToTable("AlbumImages");

        builder.HasKey(ai => ai.Id);

        builder.Property(ai => ai.Id).ValueGeneratedOnAdd();

        builder.Property(ai => ai.AlbumId).IsRequired();

        builder.Property(ai => ai.AlbumDiscId);

        builder.Property(ai => ai.FileId).IsRequired();

        builder.Property(ai => ai.ImageRole).IsRequired();

        builder
            .HasOne(pi => pi.Album)
            .WithMany(p => p.Images)
            .HasForeignKey(pi => pi.AlbumId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(ai => ai.AlbumDisc)
            .WithMany(disc => disc.Images)
            .HasForeignKey(ai => ai.AlbumDiscId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(pi => pi.File)
            .WithMany(file => file.AlbumImages)
            .HasForeignKey(pi => pi.FileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(ai => ai.AlbumId);
        builder.HasIndex(ai => ai.AlbumDiscId);
        builder.HasIndex(ai => ai.FileId);
        builder.HasIndex(ai => ai.IsPrimary);
        builder.HasIndex(ai => ai.CreatedAt);
        builder.HasIndex(ai => ai.ImageRole);
        builder.HasIndex(ai => ai.UpdatedAt);

        builder.HasIndex(ai => new { ai.AlbumId, ai.IsPrimary });

        builder
            .HasIndex(ai => new { ai.AlbumId, ai.ImageRole })
            .IsUnique()
            .HasFilter("\"IsPrimary\" = true AND \"AlbumDiscId\" IS NULL");

        builder
            .HasIndex(ai => new { ai.AlbumDiscId, ai.ImageRole })
            .IsUnique()
            .HasFilter("\"IsPrimary\" = true AND \"AlbumDiscId\" IS NOT NULL");
    }
}
