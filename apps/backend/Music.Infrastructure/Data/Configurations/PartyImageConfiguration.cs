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

        builder.Property(pi => pi.Id)
            .ValueGeneratedOnAdd();

        builder.HasOne(pi => pi.Party)
            .WithMany(p => p.Images)
            .HasForeignKey(pi => pi.PartyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(pi => pi.File)
            .WithMany()
            .HasForeignKey(pi => pi.FileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(pi => pi.PartyId);
        builder.HasIndex(pi => pi.FileId);
        builder.HasIndex(pi => pi.PartyImageType);
        builder.HasIndex(pi => pi.IsPrimary);
        builder.HasIndex(pi => pi.CreatedAt);

        builder.HasIndex(pi => new { pi.PartyId, pi.PartyImageType });
        builder.HasIndex(pi => new { pi.PartyId, pi.IsPrimary });
    }
}
