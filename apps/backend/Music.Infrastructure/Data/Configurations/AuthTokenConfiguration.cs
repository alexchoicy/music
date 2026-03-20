using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Music.Core.Entities;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Data.Configurations;

public class AuthTokenConfiguration : IEntityTypeConfiguration<AuthToken>
{
    public void Configure(EntityTypeBuilder<AuthToken> builder)
    {
        builder.ToTable("AuthTokens");

        builder.HasOne<User>()
            .WithMany(user => user.AuthTokens)
            .HasForeignKey(fo => fo.CreatedByUserId);

        builder.HasKey(token => token.Id);

        builder.HasIndex(token => token.Jti)
            .IsUnique();

        builder.HasIndex(token => token.CreatedByUserId);
    }
}
