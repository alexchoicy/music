using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class ExtraAssetConfiguration : IEntityTypeConfiguration<ExtraAsset>
{
    public void Configure(EntityTypeBuilder<ExtraAsset> builder)
    {
        builder.ToTable("ExtraAssets");

        builder.HasKey(ea => ea.Id);

        builder.Property(ea => ea.Id).ValueGeneratedOnAdd();

        builder.Property(ea => ea.ExtraId).IsRequired();

        builder.Property(ea => ea.FileId).IsRequired();

        builder
            .HasOne(ea => ea.File)
            .WithMany(f => f.ExtraAssets)
            .HasForeignKey(ea => ea.FileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(ea => ea.FileId);
        builder.HasIndex(ea => ea.CreatedAt);
        builder.HasIndex(ea => new { ea.ExtraId, ea.SortOrder });
    }
}
