using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Infrastructure.Entity;

namespace Music.Infrastructure.Data.Configurations;

public class PartyImageConfiguration : IEntityTypeConfiguration<PartyImage>
{
    public void Configure(EntityTypeBuilder<PartyImage> builder)
    {
        builder.HasOne(pi => pi.Party)
            .WithMany(p => p.Images)
            .HasForeignKey(pi => pi.PartyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(pi => pi.File)
            .WithMany()
            .HasForeignKey(pi => pi.FileId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
