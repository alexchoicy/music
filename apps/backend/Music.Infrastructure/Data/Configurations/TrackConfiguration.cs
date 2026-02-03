using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Infrastructure.Entity;

namespace Music.Infrastructure.Data.Configurations;

public class TrackConfiguration : IEntityTypeConfiguration<Track>
{
    public void Configure(EntityTypeBuilder<Track> builder)
    {
        builder.HasOne(track => track.CreatedByUser)
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
