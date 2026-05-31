using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class PartyImageConfiguration : IEntityTypeConfiguration<PartyImage>
{
    public void Configure(EntityTypeBuilder<PartyImage> builder)
    {
        builder.ToTable("PartyImages");

        builder.HasKey(pi => pi.Id);

        builder.Property(pi => pi.Id).ValueGeneratedOnAdd();

        builder.Property(pi => pi.ImageRole).IsRequired();

        builder
            .HasOne(pi => pi.Party)
            .WithMany(p => p.Images)
            .HasForeignKey(pi => pi.PartyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(pi => pi.File)
            .WithMany(file => file.PartyImages)
            .HasForeignKey(pi => pi.FileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(pi => pi.PartyId);
        builder.HasIndex(pi => pi.FileId);
        builder.HasIndex(pi => pi.ImageRole);
        builder.HasIndex(pi => pi.IsPrimary);
        builder.HasIndex(pi => pi.CreatedAt);
        builder.HasIndex(pi => pi.UpdatedAt);

        builder.HasIndex(pi => new { pi.PartyId, pi.IsPrimary });
        builder
            .HasIndex(pi => new { pi.PartyId, pi.ImageRole })
            .IsUnique()
            .HasFilter("\"IsPrimary\" = true");
    }
}
