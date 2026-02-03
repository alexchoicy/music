using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Infrastructure.Entity;

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
    }
}
