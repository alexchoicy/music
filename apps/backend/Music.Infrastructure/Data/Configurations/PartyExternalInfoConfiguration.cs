using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class PartyExternalInfoConfiguration : IEntityTypeConfiguration<PartyExternalInfo>
{
    public void Configure(EntityTypeBuilder<PartyExternalInfo> builder)
    {
        builder.ToTable("PartyExternalInfo");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).ValueGeneratedOnAdd();

        builder.Property(x => x.ExternalId).HasMaxLength(256).IsRequired();

        builder
            .HasOne(x => x.Party)
            .WithMany(p => p.PartyExternalInfos)
            .HasForeignKey(x => x.PartyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne<User>()
            .WithMany(u => u.PartyExternalInfos)
            .HasForeignKey(x => x.AddedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => x.PartyId);
        builder.HasIndex(x => x.Type);
        builder.HasIndex(x => x.ExternalId);
        builder.HasIndex(x => new { x.PartyId, x.Type }).IsUnique();
    }
}
