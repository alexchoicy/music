using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Infrastructure.Entity;

namespace Music.Infrastructure.Data.Configurations;

public class PartyMembershipConfiguration : IEntityTypeConfiguration<PartyMembership>
{
    public void Configure(EntityTypeBuilder<PartyMembership> builder)
    {
        builder.HasOne(pm => pm.Party)
            .WithMany(p => p.Members)
            .HasForeignKey(pm => pm.PartyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(pm => pm.Member)
            .WithMany(p => p.MemberOf)
            .HasForeignKey(pm => pm.MemberId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
