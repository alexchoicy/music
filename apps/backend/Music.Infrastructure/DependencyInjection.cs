using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Music.Infrastructure.Data;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure;


public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {

        services.AddDbContextPool<AppDbContext>(opt =>
        {
            opt.UseNpgsql(
                configuration["Database:ConnectionString"]);
        });

        services.AddIdentityCore<User>(opt =>
        {
            if (environment.IsDevelopment())
            {
                opt.Password.RequireDigit = false;
                opt.Password.RequireLowercase = false;
                opt.Password.RequireNonAlphanumeric = false;
                opt.Password.RequireUppercase = false;
                opt.Password.RequiredLength = 4;
            }
        }).AddRoles<IdentityRole>()
        .AddEntityFrameworkStores<AppDbContext>();




        return services;
    }
}
