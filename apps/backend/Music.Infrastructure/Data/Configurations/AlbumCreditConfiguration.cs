using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class AlbumCreditConfiguration : IEntityTypeConfiguration<AlbumCredit>
{
    public void Configure(EntityTypeBuilder<AlbumCredit> builder)
    {
        builder.ToTable("AlbumCredits");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Id)
            .ValueGeneratedOnAdd();

        builder.Property(ac => ac.AlbumId)
            .IsRequired();

        builder.Property(ac => ac.PartyId)
            .IsRequired();

        builder.HasOne(ac => ac.Album)
            .WithMany(a => a.Credits)
            .HasForeignKey(ac => ac.AlbumId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ac => ac.Party)
            .WithMany(p => p.AlbumCredits)
            .HasForeignKey(ac => ac.PartyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(ac => ac.AlbumId);
        builder.HasIndex(ac => ac.PartyId);
        builder.HasIndex(ac => ac.Credit);

        builder.HasIndex(ac => new { ac.AlbumId, ac.PartyId, ac.Credit }).IsUnique();
    }
}
