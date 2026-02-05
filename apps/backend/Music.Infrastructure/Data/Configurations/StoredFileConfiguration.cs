using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class FileConfiguration : IEntityTypeConfiguration<StoredFile>
{
    public void Configure(EntityTypeBuilder<StoredFile> builder)
    {
        builder.ToTable("StoredFiles");

        builder.HasKey(f => f.Id);

        builder.Property(f => f.Id)
            .ValueGeneratedOnAdd();

        builder.HasMany(f => f.FileObjects)
            .WithOne(fo => fo.File)
            .HasForeignKey(fo => fo.FileId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(f => f.TrackSources)
            .WithOne(ts => ts.File)
            .HasForeignKey(ts => ts.FileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(f => f.Type);
    }
}
