using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Music.Api.Handlers;
using Music.Core.Enums;
using Music.Infrastructure;
using Music.Infrastructure.Data;
using Music.Infrastructure.Data.Seed;
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

builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(p => p
        .WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [])
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()
    );
});

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
            if (context.Request.Cookies.TryGetValue("AlexCoolShelfAppToken", out string? authToken))
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
        policy => policy.RequireClaim("access_type", TokenUseType.USERACCESS.ToString()));

    options.AddPolicy("RequireAdminRole", policy => policy.RequireRole(Roles.ADMIN.ToString()));

    options.AddPolicy("ShareAllowed", policy =>
        policy.RequireClaim("access_type",
            TokenUseType.USERACCESS.ToString(),
            TokenUseType.CONTENTACCESS.ToString()));

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

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    dbContext.Database.Migrate();
    ILogger logger = scope.ServiceProvider.GetRequiredService<ILogger>();
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
