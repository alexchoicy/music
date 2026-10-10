using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class ExtraConcertConfiguration : IEntityTypeConfiguration<ExtraConcert>
{
    public void Configure(EntityTypeBuilder<ExtraConcert> builder)
    {
        builder.ToTable("ExtraConcerts");

        builder.HasKey(ec => new { ec.ExtraId, ec.ConcertId });

        builder.Property(ec => ec.ExtraId).IsRequired();

        builder.Property(ec => ec.ConcertId).IsRequired();

        builder
            .HasOne(ec => ec.Concert)
            .WithMany()
            .HasForeignKey(ec => ec.ConcertId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(ec => ec.ConcertId);
    }
}
