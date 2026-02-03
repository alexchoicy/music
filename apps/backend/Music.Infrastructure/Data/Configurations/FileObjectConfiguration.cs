using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Infrastructure.Entity;

namespace Music.Infrastructure.Data.Configurations;

public class FileObjectConfiguration : IEntityTypeConfiguration<FileObject>
{
    public void Configure(EntityTypeBuilder<FileObject> builder)
    {
        builder.HasOne(fo => fo.CreatedByUser)
            .WithMany(user => user.CreatedFileObjects)
            .HasForeignKey(fo => fo.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(fo => fo.File)
            .WithMany(ft => ft.FileObjects)
            .HasForeignKey(fo => fo.FileId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(fo => fo.FileId);
        builder.HasIndex(fo => fo.OriginalBlake3Hash);
        builder.HasIndex(fo => fo.CurrentBlake3Hash);
        builder.HasIndex(fo => fo.Type);
        builder.HasIndex(fo => fo.MimeType);
        builder.HasIndex(fo => fo.CreatedByUserId);
        builder.HasIndex(fo => fo.CreatedAt);

        builder.HasIndex(fo => new { fo.FileId, fo.Type });
    }
}
