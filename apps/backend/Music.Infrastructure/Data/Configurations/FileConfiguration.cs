using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Infrastructure.Entity;

namespace Music.Infrastructure.Data.Configurations;

public class FileConfiguration : IEntityTypeConfiguration<Entity.File>
{
    public void Configure(EntityTypeBuilder<Entity.File> builder)
    {
        builder.HasMany(f => f.FileObjects)
            .WithOne(fo => fo.File)
            .HasForeignKey(fo => fo.FileId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(f => f.TrackSources)
            .WithOne(ts => ts.File)
            .HasForeignKey(ts => ts.FileId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(f => f.Type);
    }
}
