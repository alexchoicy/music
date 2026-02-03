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
    }
}
