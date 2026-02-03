using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Music.Infrastructure.Data.Configurations;

public class FileConfiguration : IEntityTypeConfiguration<Entities.File>
{
    public void Configure(EntityTypeBuilder<Entities.File> builder)
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
