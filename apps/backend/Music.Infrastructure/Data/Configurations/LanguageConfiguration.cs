using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class LanguageConfiguration : IEntityTypeConfiguration<Language>
{
    public void Configure(EntityTypeBuilder<Language> builder)
    {
        builder.ToTable("Languages");

        builder.HasKey(l => l.Id);

        builder.Property(l => l.Id)
            .ValueGeneratedOnAdd();

        builder.HasMany(l => l.Albums)
            .WithOne(a => a.Language)
            .HasForeignKey(a => a.LanguageId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(l => l.Tracks)
            .WithOne(t => t.Language)
            .HasForeignKey(t => t.LanguageId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(l => l.Name).IsUnique();
    }
}
