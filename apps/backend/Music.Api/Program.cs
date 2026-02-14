using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text.Json.Serialization;
using Music.Api.Handlers;
using Music.Api.Startup;
using Music.Core.Enums;
using Music.Core.Models;
using Music.Infrastructure;
using Music.Infrastructure.Data;
using Music.Infrastructure.Data.Seed;
using Music.Core.Entities;
using Music.Infrastructure.Entities;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails(configure =>
{
    configure.CustomizeProblemDetails = options =>
    {
        options.ProblemDetails.Extensions.TryAdd("traceId",
            options.HttpContext.TraceIdentifier);
        options.ProblemDetails.Extensions.TryAdd("timestamp",
            DateTime.UtcNow);
    };
});
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(p => p
        .WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [])
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()
    );
});

// Config
// call with "IOptions<StorageOptions>" injection
builder.Services.Configure<StorageOptions>(builder.Configuration.GetSection("Storage"));

ConfigValidation.Validation(builder.Configuration);
// Checked in Validation
string cookieName = builder.Configuration.GetValue<string>("Cookies:Name")!;

builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme =
    options.DefaultAuthenticateScheme =
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(JwtBearerDefaults.AuthenticationScheme, options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["JWT:Issuer"],
        ValidAudience = builder.Configuration["JWT:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["JWT:SecretKey"]!)
        )
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            if (context.Request.Cookies.TryGetValue(cookieName, out string? authToken))
            {
                context.Token = authToken;
            }

            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("UserAllowed",
        policy => policy.RequireClaim("access_type", TokenUseType.UserAccess.ToString()));

    options.AddPolicy("RequireAdminRole", policy => policy.RequireRole(Roles.Admin.ToString()));

    options.AddPolicy("ShareAllowed", policy =>
        policy.RequireClaim("access_type",
            TokenUseType.UserAccess.ToString(),
            TokenUseType.ContentAccess.ToString()));

    options.DefaultPolicy = options.GetPolicy("UserAllowed")!;
});

builder.Services.AddInfrastructure(builder.Configuration, builder.Environment);

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "v1");
    });
}

using (IServiceScope scope = app.Services.CreateScope())
{
    AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    dbContext.Database.Migrate();
    ILogger<UserSeed> logger = scope.ServiceProvider.GetRequiredService<ILogger<UserSeed>>();
    UserManager<User> userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();

    await UserSeed.SeedAsync(dbContext, logger, userManager, builder.Configuration, builder.Environment);

    //Create a "Unknown" party for works
    await PartySeed.SeedAsync(dbContext);
}

app.UseHttpsRedirection();

app.UseExceptionHandler();

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
