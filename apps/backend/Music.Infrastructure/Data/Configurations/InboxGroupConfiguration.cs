using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class InboxGroupConfiguration : IEntityTypeConfiguration<InboxGroup>
{
    public void Configure(EntityTypeBuilder<InboxGroup> builder)
    {
        builder.ToTable("InboxGroups");
        builder.HasKey(group => group.Id);
        builder.Property(group => group.Note).HasMaxLength(1000);
        builder
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(group => group.UploadedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
        builder
            .HasMany(group => group.Items)
            .WithOne(item => item.Group)
            .HasForeignKey(item => item.GroupId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(group => group.UploadedByUserId);
        builder.HasIndex(group => group.CreatedAt);
    }
}
