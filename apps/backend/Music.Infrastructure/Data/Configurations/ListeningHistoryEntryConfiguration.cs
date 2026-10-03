using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class ListeningHistoryEntryConfiguration : IEntityTypeConfiguration<ListeningHistoryEntry>
{
    public void Configure(EntityTypeBuilder<ListeningHistoryEntry> builder)
    {
        builder.ToTable("ListeningHistoryEntries");
        builder.HasKey(entry => entry.Id);
        builder
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(entry => entry.UserId)
            .OnDelete(DeleteBehavior.Restrict);
        builder
            .HasOne(entry => entry.AlbumTrack)
            .WithMany()
            .HasForeignKey(entry => entry.AlbumTrackId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(entry => new { entry.UserId, entry.Id });
    }
}
