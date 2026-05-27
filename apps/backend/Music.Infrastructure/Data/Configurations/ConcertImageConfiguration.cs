using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class ConcertImageConfiguration : IEntityTypeConfiguration<ConcertImage>
{
    public void Configure(EntityTypeBuilder<ConcertImage> builder)
    {
        builder.ToTable("ConcertImages");

        builder.HasKey(ci => ci.Id);

        builder.Property(ci => ci.Id)
            .ValueGeneratedOnAdd();

        builder.Property(ci => ci.ConcertId)
            .IsRequired();

        builder.Property(ci => ci.FileId)
            .IsRequired();

        builder.Property(ci => ci.ImageRole)
            .IsRequired();

        builder.HasOne(ci => ci.Concert)
            .WithMany(concert => concert.Images)
            .HasForeignKey(ci => ci.ConcertId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ci => ci.File)
            .WithMany(file => file.ConcertImages)
            .HasForeignKey(ci => ci.FileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(ci => ci.ConcertId);
        builder.HasIndex(ci => ci.FileId);
        builder.HasIndex(ci => ci.ImageRole);
        builder.HasIndex(ci => ci.IsPrimary);
        builder.HasIndex(ci => ci.CreatedAt);
        builder.HasIndex(ci => ci.UpdatedAt);

        builder.HasIndex(ci => new { ci.ConcertId, ci.IsPrimary });
        builder.HasIndex(ci => new { ci.ConcertId, ci.ImageRole })
            .IsUnique()
            .HasFilter("\"IsPrimary\" = true");
    }
}
