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
using Music.Core.Entities;
using Music.Infrastructure.Services.Album;
using Music.Infrastructure.Services.Auth;
using Music.Infrastructure.Services.Party;
using Music.Infrastructure.Services.Storage;
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
        services.AddScoped<IAlbumService, AlbumService>();


        // Content Service
        services.AddScoped<IContentService>(sp =>
        {
            StorageProvider provider = sp.GetRequiredService<IOptions<StorageOptions>>().Value.Content.Provider;
            return provider switch
            {
                StorageProvider.S3 => new S3ContentService(sp.GetRequiredService<IOptions<StorageOptions>>()),
                _ => throw new NotSupportedException($"Unsupported storage provider for content: {provider}")
            };
        });

        services.AddScoped<IAssetsService>(sp =>
        {
            StorageProvider provider = sp.GetRequiredService<IOptions<StorageOptions>>().Value.Assets.Provider;
            return provider switch
            {
                StorageProvider.S3 => new S3AssetsService(sp.GetRequiredService<IOptions<StorageOptions>>()),
                _ => throw new NotSupportedException($"Unsupported storage provider for assets: {provider}")
            };
        });



        return services;
    }
}
