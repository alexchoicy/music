using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class FileConfiguration : IEntityTypeConfiguration<StoredFile>
{
    public void Configure(EntityTypeBuilder<StoredFile> builder)
    {
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
