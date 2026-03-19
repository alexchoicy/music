using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class ConcertFileConfiguration : IEntityTypeConfiguration<ConcertFile>
{
    public void Configure(EntityTypeBuilder<ConcertFile> builder)
    {
        builder.ToTable("ConcertFiles");

        builder.HasKey(cf => cf.Id);

        builder.Property(cf => cf.Id)
            .ValueGeneratedOnAdd();

        builder.Property(cf => cf.ConcertId)
            .IsRequired();

        builder.Property(cf => cf.FileId)
            .IsRequired();

        builder.Property(cf => cf.Title)
            .IsRequired();

        builder.HasOne(cf => cf.Concert)
            .WithMany(c => c.ConcertFiles)
            .HasForeignKey(cf => cf.ConcertId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(cf => cf.File)
            .WithMany(f => f.ConcertFiles)
            .HasForeignKey(cf => cf.FileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(cf => cf.ConcertId);
        builder.HasIndex(cf => cf.FileId);
        builder.HasIndex(cf => cf.Type);
        builder.HasIndex(cf => cf.CreatedAt);
        builder.HasIndex(cf => new { cf.ConcertId, cf.Order });
    }
}
