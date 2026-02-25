using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class TrackConfiguration : IEntityTypeConfiguration<Track>
{
    public void Configure(EntityTypeBuilder<Track> builder)
    {
        builder.ToTable("Tracks");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.Id)
            .ValueGeneratedOnAdd();

        builder.Property(t => t.Version)
            .IsRowVersion();

        builder.HasOne<User>()
            .WithMany(user => user.CreatedTracks)
            .HasForeignKey(track => track.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(t => t.NormalizedTitle);
        builder.HasIndex(t => t.IsMC);
        builder.HasIndex(t => t.LanguageId);
        builder.HasIndex(t => t.CreatedByUserId);
        builder.HasIndex(t => t.CreatedAt);
        builder.HasIndex(t => t.UpdatedAt);

        builder.HasIndex(t => new { t.LanguageId, t.IsMC });
    }
}
