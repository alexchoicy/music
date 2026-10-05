using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class InboxItemConfiguration : IEntityTypeConfiguration<InboxItem>
{
    public void Configure(EntityTypeBuilder<InboxItem> builder)
    {
        builder.ToTable("InboxItems");
        builder.HasKey(item => item.Id);
        builder.Property(item => item.Title).HasMaxLength(1000);
        builder.Property(item => item.Album).HasMaxLength(1000);
        builder.Property(item => item.Date).HasMaxLength(100);
        builder
            .HasOne(item => item.File)
            .WithMany()
            .HasForeignKey(item => item.FileId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(item => item.FileId).IsUnique();
        builder.HasIndex(item => new { item.GroupId, item.Position });
        builder.HasIndex(item => item.Status);
    }
}
