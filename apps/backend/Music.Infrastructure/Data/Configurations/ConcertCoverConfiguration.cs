using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class ConcertCoverConfiguration : IEntityTypeConfiguration<ConcertCover>
{
    public void Configure(EntityTypeBuilder<ConcertCover> builder)
    {
        builder.ToTable("ConcertCovers");

        builder.HasKey(cc => cc.Id);

        builder.Property(cc => cc.Id)
            .ValueGeneratedOnAdd();

        builder.Property(cc => cc.ConcertId)
            .IsRequired();

        builder.Property(cc => cc.FileId)
            .IsRequired();

        builder.HasOne(cc => cc.File)
            .WithMany(f => f.ConcertCovers)
            .HasForeignKey(cc => cc.FileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(cc => cc.ConcertId)
            .IsUnique();
        builder.HasIndex(cc => cc.FileId);
        builder.HasIndex(cc => cc.CreatedAt);
    }
}
