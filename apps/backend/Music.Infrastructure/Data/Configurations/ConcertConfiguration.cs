using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class ConcertConfiguration : IEntityTypeConfiguration<Concert>
{
    public void Configure(EntityTypeBuilder<Concert> builder)
    {
        builder.ToTable("Concerts");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Id)
            .ValueGeneratedOnAdd();

        builder.HasOne<User>()
            .WithMany(user => user.CreatedConcerts)
            .HasForeignKey(concert => concert.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(c => c.Cover)
            .WithOne(cc => cc.Concert)
            .HasForeignKey<ConcertCover>(cc => cc.ConcertId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(c => c.ConcertAlbums)
            .WithOne(ca => ca.Concert)
            .HasForeignKey(ca => ca.ConcertId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(c => c.ConcertParties)
            .WithOne(cp => cp.Concert)
            .HasForeignKey(cp => cp.ConcertId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(c => c.ConcertFiles)
            .WithOne(cf => cf.Concert)
            .HasForeignKey(cf => cf.ConcertId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(c => c.NormalizedTitle);
        builder.HasIndex(c => c.Date);
        builder.HasIndex(c => c.CreatedByUserId);
        builder.HasIndex(c => c.CreatedAt);
        builder.HasIndex(c => c.UpdatedAt);
    }
}
