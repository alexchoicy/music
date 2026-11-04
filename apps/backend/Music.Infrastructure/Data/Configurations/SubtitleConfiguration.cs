using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class SubtitleConfiguration : IEntityTypeConfiguration<Subtitle>
{
    public void Configure(EntityTypeBuilder<Subtitle> builder)
    {
        builder.ToTable(
            "Subtitles",
            table =>
                table.HasCheckConstraint(
                    "CK_Subtitles_SingleOwner",
                    "(\"TrackId\" IS NULL) <> (\"ConcertFileId\" IS NULL)"
                )
        );

        builder.HasKey(s => s.Id);

        builder.Property(s => s.Id).ValueGeneratedOnAdd();

        builder.Property(s => s.Title).HasMaxLength(250);

        builder.Property(s => s.Format).IsRequired();

        builder.Property(s => s.Content).IsRequired();

        builder.Property(s => s.Parsed).HasColumnType("jsonb");

        builder.Property(s => s.Version).IsRowVersion();

        builder
            .HasOne(s => s.Track)
            .WithMany(t => t.Subtitles)
            .HasForeignKey(s => s.TrackId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(s => s.ConcertFile)
            .WithMany(cf => cf.Subtitles)
            .HasForeignKey(s => s.ConcertFileId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne<User>()
            .WithMany(user => user.CreatedSubtitles)
            .HasForeignKey(s => s.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(s => new { s.TrackId, s.Order });
        builder.HasIndex(s => new { s.ConcertFileId, s.Order });
        builder.HasIndex(s => s.LanguageId);
        builder.HasIndex(s => s.CreatedByUserId);
        builder.HasIndex(s => s.CreatedAt);
    }
}
