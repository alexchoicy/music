using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Music.Core.Enums;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Data.Seed;

public class UserSeed
{
    public static async Task SeedAsync(AppDbContext context, ILogger logger, UserManager<User> userManager, IConfiguration configuration, IHostEnvironment environment)
    {
        if (context.Users.Any())
            return;

        User adminUser = new()
        {
            UserName = configuration["Seed:AdminUser:UserName"] ?? "admin",
        };

        string? adminPassword = configuration["Seed:AdminUser:Password"];

        if (!environment.IsDevelopment() && string.IsNullOrWhiteSpace(adminPassword))
        {
            logger.LogError("add your admin password in appsettings.json or environment variables");
            Environment.FailFast("Missing default admin password: Seed:AdminUser:Password");
        }

        IdentityResult result = await userManager.CreateAsync(adminUser, adminPassword ?? "admin");

        if (result.Succeeded)
        {
            await userManager.AddToRoleAsync(adminUser, Roles.ADMIN.ToString());
        }
    }

}
