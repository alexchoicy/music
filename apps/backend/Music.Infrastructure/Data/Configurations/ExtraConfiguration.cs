using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class ExtraConfiguration : IEntityTypeConfiguration<Extra>
{
    public void Configure(EntityTypeBuilder<Extra> builder)
    {
        builder.ToTable("Extras");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Id).ValueGeneratedOnAdd();

        builder.Property(e => e.Title).IsRequired();

        builder.Property(e => e.Category).IsRequired();

        builder.Property(e => e.Source).IsRequired();

        builder.Property(e => e.Version).IsRowVersion();

        builder
            .HasOne<User>()
            .WithMany(user => user.CreatedExtras)
            .HasForeignKey(extra => extra.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasMany(e => e.Assets)
            .WithOne(asset => asset.Extra)
            .HasForeignKey(asset => asset.ExtraId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(e => e.CoverAsset)
            .WithMany()
            .HasForeignKey(e => e.CoverAssetId)
            .OnDelete(DeleteBehavior.SetNull);

        builder
            .HasMany(e => e.ExtraAlbums)
            .WithOne(ea => ea.Extra)
            .HasForeignKey(ea => ea.ExtraId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasMany(e => e.ExtraConcerts)
            .WithOne(ec => ec.Extra)
            .HasForeignKey(ec => ec.ExtraId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasMany(e => e.ExtraParties)
            .WithOne(ep => ep.Extra)
            .HasForeignKey(ep => ep.ExtraId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => e.Category);
        builder.HasIndex(e => e.CoverAssetId);
        builder.HasIndex(e => e.CreatedByUserId);
        builder.HasIndex(e => e.CreatedAt);
        builder.HasIndex(e => e.UpdatedAt);
    }
}
