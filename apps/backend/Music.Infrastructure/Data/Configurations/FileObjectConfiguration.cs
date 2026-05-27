using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class FileObjectConfiguration : IEntityTypeConfiguration<FileObject>
{
    public void Configure(EntityTypeBuilder<FileObject> builder)
    {
        builder.ToTable("FileObjects");

        builder.HasKey(fo => fo.Id);

        builder.HasOne(fo => fo.File)
            .WithMany(ft => ft.FileObjects)
            .HasForeignKey(fo => fo.FileId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(fo => fo.FileId);
        builder.HasIndex(fo => fo.ObjectBlake3Hash);
        builder.HasIndex(fo => fo.Type);
        builder.HasIndex(fo => fo.MimeType);
        builder.HasIndex(fo => fo.CreatedAt);

        builder.HasIndex(fo => new { fo.FileId, fo.Type });
        builder.HasIndex(fo => new { fo.FileId, fo.FileObjectVariant });
    }
}
