using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Music.Core.Enums;
using Music.Core.Models;
using Music.Core.Services.Interfaces;
using Music.Infrastructure.Data;
using Music.Infrastructure.Entities;
using Music.Infrastructure.Services.Auth;
using Music.Infrastructure.Services.Party;
using Music.Infrastructure.Services.Storage;

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
                configuration["Database:DBConnectionString"]);
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

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IPartyService, PartyService>();


        // Content Service
        services.AddScoped<IContentService>(sp =>
        {
            StorageProvider provieder = sp.GetRequiredService<IOptions<StorageOptions>>().Value.Content.Provider;

            return provieder switch
            {
                StorageProvider.S3 => new S3ContentService(sp.GetRequiredService<IOptions<StorageOptions>>()),
                _ => throw new NotSupportedException($"Unsupported storage provider for content: {provieder}")
            };
        });

        services.AddScoped<IAssetsService>(sp =>
        {
            StorageProvider provieder = sp.GetRequiredService<IOptions<StorageOptions>>().Value.Assets.Provider;

            return provieder switch
            {
                StorageProvider.S3 => new S3AssetsService(sp.GetRequiredService<IOptions<StorageOptions>>()),
                _ => throw new NotSupportedException($"Unsupported storage provider for assets: {provieder}")
            };
        });



        return services;
    }
}
