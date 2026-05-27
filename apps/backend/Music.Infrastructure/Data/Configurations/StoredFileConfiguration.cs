using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class StoredFileConfiguration : IEntityTypeConfiguration<StoredFile>
{
    public void Configure(EntityTypeBuilder<StoredFile> builder)
    {
        builder.ToTable("StoredFiles");

        builder.HasKey(f => f.Id);

        builder.Property(f => f.Id)
            .ValueGeneratedOnAdd();

        builder.Property(f => f.Source)
            .IsRequired();

        builder.Property(f => f.OriginalBlake3Hash)
            .IsRequired();

        builder.Property(f => f.OriginalFileName)
            .IsRequired();

        builder.HasOne<User>()
            .WithMany(user => user.UploadedFiles)
            .HasForeignKey(f => f.UploadedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(f => f.FileObjects)
            .WithOne(fo => fo.File)
            .HasForeignKey(fo => fo.FileId)
            .OnDelete(DeleteBehavior.Cascade);


        builder.HasMany(f => f.TrackAudios)
            .WithOne(ta => ta.File)
            .HasForeignKey(ta => ta.FileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(f => f.AlbumImages)
            .WithOne(image => image.File)
            .HasForeignKey(image => image.FileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(f => f.PartyImages)
            .WithOne(image => image.File)
            .HasForeignKey(image => image.FileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(f => f.ConcertImages)
            .WithOne(image => image.File)
            .HasForeignKey(image => image.FileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(f => f.ConcertFiles)
            .WithOne(file => file.File)
            .HasForeignKey(file => file.FileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(f => f.Type);
        builder.HasIndex(f => f.Source);
        builder.HasIndex(f => f.OriginalBlake3Hash).IsUnique();
        builder.HasIndex(f => f.UploadedByUserId);
        builder.HasIndex(f => f.CreatedAt);
        builder.HasIndex(f => f.UpdatedAt);
    }
}
