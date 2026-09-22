using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class PartyMembershipConfiguration : IEntityTypeConfiguration<PartyMembership>
{
    public void Configure(EntityTypeBuilder<PartyMembership> builder)
    {
        builder.ToTable("PartyMemberships");

        builder.HasKey(pm => pm.Id);
        builder.Property(pm => pm.Id).ValueGeneratedOnAdd();

        builder
            .HasIndex(pm => new
            {
                pm.PartyId,
                pm.MemberId,
                pm.Type,
            })
            .IsUnique();

        builder
            .HasOne(pm => pm.Party)
            .WithMany(p => p.Members)
            .HasForeignKey(pm => pm.PartyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(pm => pm.Member)
            .WithMany(p => p.MemberOf)
            .HasForeignKey(pm => pm.MemberId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(pm => pm.PartyId);
        builder.HasIndex(pm => pm.MemberId);
    }
}
