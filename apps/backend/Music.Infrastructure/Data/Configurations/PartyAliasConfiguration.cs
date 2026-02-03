using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class PartyAliasConfiguration : IEntityTypeConfiguration<PartyAlias>
{
    public void Configure(EntityTypeBuilder<PartyAlias> builder)
    {
        builder.HasOne(aa => aa.Party)
            .WithMany(p => p.Aliases)
            .HasForeignKey(aa => aa.PartyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(aa => aa.CreatedByUser)
            .WithMany()
            .HasForeignKey(aa => aa.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(aa => aa.PartyId);
        builder.HasIndex(aa => aa.NormalizedName);
        builder.HasIndex(aa => aa.SourceType);
        builder.HasIndex(aa => aa.CreatedByUserId);
        builder.HasIndex(aa => aa.DeletedAt);
        builder.HasIndex(aa => aa.CreatedAt);

        builder.HasIndex(aa => new { aa.PartyId, aa.DeletedAt });
        builder.HasIndex(aa => new { aa.NormalizedName, aa.DeletedAt });
    }
}
