using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Music.Api.Authentication;
using Music.Api.Handlers;
using Music.Api.Startup;
using Music.Core.Common.Constants;
using Music.Core.Options;
using Music.Core.Services.Auth.Enums;
using Music.Infrastructure;
using Music.Infrastructure.Data;
using Music.Infrastructure.Data.Seed;
using Music.Infrastructure.Entities;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails(configure =>
{
    configure.CustomizeProblemDetails = options =>
    {
        options.ProblemDetails.Extensions.TryAdd("traceId", options.HttpContext.TraceIdentifier);
        options.ProblemDetails.Extensions.TryAdd("timestamp", DateTime.UtcNow);
    };
});
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer(
        (document, context, ct) =>
        {
            document.Servers = [new() { Url = builder.Configuration["Base:ApiUrl"]! }];
            return Task.CompletedTask;
        }
    );
});

builder
    .Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(p =>
        p.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [])
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
    );
});

// Config
// call with "IOptions<StorageOptions>" injection
builder.Services.Configure<StorageOptions>(builder.Configuration.GetSection("Storage"));
builder.Services.Configure<BaseOptions>(builder.Configuration.GetSection("Base"));
builder.Services.Configure<ExternalOptions>(builder.Configuration.GetSection("External"));

ConfigValidation.Validation(builder.Configuration);
ProxyConfiguration.Configure(builder.Services, builder.Configuration);

string ServerDomain = builder.Configuration.GetValue<string>("Cookies:Domain")!;

builder.Services.Configure<IdentityPasskeyOptions>(options =>
{
    options.ServerDomain = ServerDomain!;
    options.AuthenticatorTimeout = TimeSpan.FromMinutes(3);
    options.ChallengeSize = 64;
    options.UserVerificationRequirement = "required";
    options.ResidentKeyRequirement = "preferred";
});

builder.Services.AddSingleton<SessionCookie>();

builder
    .Services.AddAuthentication(SessionAuthenticationHandler.SchemeName)
    .AddScheme<AuthenticationSchemeOptions, SessionAuthenticationHandler>(
        SessionAuthenticationHandler.SchemeName,
        null
    )
    .AddCookie(IdentityConstants.TwoFactorUserIdScheme);

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(
        AuthorizationPolicies.UserAllowed,
        policy => policy.RequireClaim(AuthClaimNames.AccessType, TokenUseType.UserAccess.ToString())
    );

    options.AddPolicy(
        AuthorizationPolicies.RequireAdminRole,
        policy => policy.RequireRole(Roles.Admin.ToString(), Roles.Owner.ToString())
    );

    options.AddPolicy(
        AuthorizationPolicies.RequireUploaderRole,
        policy =>
            policy.RequireRole(
                Roles.Uploader.ToString(),
                Roles.Admin.ToString(),
                Roles.Owner.ToString()
            )
    );

    options.AddPolicy(
        AuthorizationPolicies.BotAllowed,
        policy =>
            policy.RequireClaim(
                AuthClaimNames.AccessType,
                TokenUseType.Machine.ToString(),
                TokenUseType.UserAccess.ToString()
            )
    );

    options.DefaultPolicy = options.GetPolicy(AuthorizationPolicies.UserAllowed)!;
});

builder.Services.AddInfrastructure(builder.Configuration, builder.Environment);

var app = builder.Build();

// Configure the HTTP request pipeline.
// if (app.Environment.IsDevelopment())
// {
app.MapOpenApi();

app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/openapi/v1.json", "v1");
});

// }

using (IServiceScope scope = app.Services.CreateScope())
{
    AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    dbContext.Database.Migrate();
    ILogger<UserSeed> logger = scope.ServiceProvider.GetRequiredService<ILogger<UserSeed>>();
    UserManager<User> userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();

    await UserSeed.SeedAsync(
        dbContext,
        logger,
        userManager,
        builder.Configuration,
        builder.Environment
    );

    await LanguageSeed.SeedAsync(dbContext);

    //Create a "Unknown" party for works
    await PartySeed.SeedAsync(dbContext);
}

app.UseExceptionHandler();

app.UseForwardedHeaders();

app.UseCors();

app.UseWebSockets();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
