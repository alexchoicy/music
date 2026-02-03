using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Music.Infrastructure.Entity;

namespace Music.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<User>(options)
{
    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        List<IdentityRole> roles = new()
        {
            new IdentityRole
            {
                Id = "00000000-0000-0000-0000-000000000001",
                Name = Core.Enum.Roles.ADMIN.ToString(),
                NormalizedName = Core.Enum.Roles.ADMIN.ToString().ToUpper(),
                ConcurrencyStamp = "508a0eaf-dbca-47d9-baeb-597b81a4957e"
            },
            new IdentityRole
            {
                Id = "00000000-0000-0000-0000-000000000002",
                Name = Core.Enum.Roles.UPLOADER.ToString(),
                NormalizedName = Core.Enum.Roles.UPLOADER.ToString().ToUpper(),
                ConcurrencyStamp = "70b645e2-64b9-4d69-8a37-46413af238b0"
            },
            new IdentityRole
            {
                Id = "00000000-0000-0000-0000-000000000003",
                Name = Core.Enum.Roles.USER.ToString(),
                NormalizedName = Core.Enum.Roles.USER.ToString().ToUpper(),
                ConcurrencyStamp = "70b645e2-64b9-4d69-8a37-46413af238b0"
            }
        };

        builder.Entity<IdentityRole>().HasData(roles);
    }
}
