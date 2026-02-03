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
    }
}
