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
using Music.Infrastructure.Services.Album;
using Music.Infrastructure.Services.Auth;
using Music.Infrastructure.Services.Party;
using Music.Infrastructure.Services.Storage;
using Music.Infrastructure.Entities;
using Amazon.S3;
using Music.Infrastructure.Services.Files;
using Music.Infrastructure.Services.Me;

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
        services.AddScoped<IFileUrlService, FileUrlService>();
        services.AddScoped<IMeService, MeService>();

        StorageOptions storage = configuration
            .GetSection("Storage")
            .Get<StorageOptions>()
            ?? throw new InvalidOperationException("Storage config missing");

        if (storage.Assets.Provider == StorageProvider.S3)
        {
            services.AddSingleton<AssetsS3Client>(_ =>
            {
                var opt = storage.Assets.S3 ?? throw new InvalidOperationException("Assets S3 settings missing.");
                var cfg = new AmazonS3Config
                {
                    ServiceURL = opt.Endpoint,
                    ForcePathStyle = true,
                    AuthenticationRegion = opt.Region,
                };

                return new AssetsS3Client(opt.AccessKey, opt.SecretKey, cfg);
            });
        }

        if (storage.Content.Provider == StorageProvider.S3)
        {
            services.AddSingleton<Content3Client>(_ =>
            {
                var opt = storage.Content.S3 ?? throw new InvalidOperationException("Content S3 settings missing.");
                var cfg = new AmazonS3Config
                {
                    ServiceURL = opt.Endpoint,
                    ForcePathStyle = true,
                    AuthenticationRegion = opt.Region,
                };

                return new Content3Client(opt.AccessKey, opt.SecretKey, cfg);
            });
        }

        services.AddScoped<S3ContentService>();
        services.AddScoped<S3AssetsService>();

        services.AddScoped<IContentService>(sp =>
        {
            var provider = sp.GetRequiredService<IOptions<StorageOptions>>().Value.Content.Provider;
            return provider switch
            {
                StorageProvider.S3 => sp.GetRequiredService<S3ContentService>(),
                _ => throw new NotSupportedException($"Unsupported storage provider for content: {provider}")
            };
        });

        services.AddScoped<IAssetsService>(sp =>
        {
            StorageProvider provider = sp.GetRequiredService<IOptions<StorageOptions>>().Value.Assets.Provider;
            return provider switch
            {
                StorageProvider.S3 => sp.GetRequiredService<S3AssetsService>(),
                _ => throw new NotSupportedException($"Unsupported storage provider for assets: {provider}")
            };
        });

        return services;
    }
}
