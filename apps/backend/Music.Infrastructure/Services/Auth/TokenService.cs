using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Music.Core.Enums;
using Music.Core.Services.Interfaces;
using Music.Core.Models;
using Music.Infrastructure.Data;
using Music.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Music.Core.Constants;

namespace Music.Infrastructure.Services.Auth;

public class TokenService : ITokenService
{
    private readonly IConfiguration _config;
    private readonly SymmetricSecurityKey _key;
    private readonly AppDbContext _dbContext;

    public TokenService(AppDbContext dbContext, IConfiguration config)
    {
        _config = config;
        _dbContext = dbContext;

        _key = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(_config["JWT:SecretKey"]!));
    }

    public async Task<string> GenerateUserToken(UserInfo user, IList<string> roles)
    {
        string jti = Guid.CreateVersion7().ToString("N");

        List<Claim> claims =
           [
               new Claim(JwtRegisteredClaimNames.Sub, user.Id),
               new Claim(JwtRegisteredClaimNames.Jti, jti),
               new Claim(JwtRegisteredClaimNames.NameId, user.Id),
               new Claim(ClaimTypes.NameIdentifier, user.Id),
               new Claim(JwtRegisteredClaimNames.Name, user.UserName!),
               new Claim(AuthClaimNames.AccessType, TokenUseType.UserAccess.ToString()),
           ];

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        SigningCredentials creds = new(_key, SecurityAlgorithms.HmacSha512Signature);

        SecurityTokenDescriptor tokenDescriptor = new()
        {
            Subject = new ClaimsIdentity(claims),
            SigningCredentials = creds,
            Issuer = _config["JWT:Issuer"],
            Audience = _config["JWT:Audience"],
            Expires = DateTime.UtcNow.AddDays(7),
        };

        JwtSecurityTokenHandler tokenHandler = new();

        SecurityToken securityToken = tokenHandler.CreateToken(tokenDescriptor);

        string token = tokenHandler.WriteToken(securityToken);

        await SaveAuthToken(user.Id, TokenUseType.Machine, jti, token);
        return token;
    }

    public async Task<string> GenerateUploadToken(string userId)
    {
        string jti = Guid.CreateVersion7().ToString("N");

        List<Claim> claims =
           [
               new Claim(JwtRegisteredClaimNames.Sub, userId),
               new Claim(JwtRegisteredClaimNames.Jti, jti),
               new Claim(JwtRegisteredClaimNames.NameId, userId),
               new Claim(ClaimTypes.NameIdentifier, userId),
               new Claim(AuthClaimNames.AccessType, TokenUseType.Upload.ToString()),
           ];

        SigningCredentials creds = new(_key, SecurityAlgorithms.HmacSha512Signature);

        SecurityTokenDescriptor tokenDescriptor = new()
        {
            Subject = new ClaimsIdentity(claims),
            SigningCredentials = creds,
            Issuer = _config["JWT:Issuer"],
            Audience = _config["JWT:Audience"],
            Expires = DateTime.Now.AddHours(10)
        };

        JwtSecurityTokenHandler tokenHandler = new();

        SecurityToken securityToken = tokenHandler.CreateToken(tokenDescriptor);

        string token = tokenHandler.WriteToken(securityToken);

        return token;
    }

    public async Task<string> GenerateBotToken(string userId)
    {
        string jti = Guid.CreateVersion7().ToString("N");

        List<Claim> claims =
           [
               new Claim(JwtRegisteredClaimNames.Sub, userId),
               new Claim(JwtRegisteredClaimNames.Jti, jti),
               new Claim(JwtRegisteredClaimNames.NameId, userId),
               new Claim(ClaimTypes.NameIdentifier, userId),
               new Claim(AuthClaimNames.AccessType, TokenUseType.Machine.ToString()),
           ];

        SigningCredentials creds = new(_key, SecurityAlgorithms.HmacSha512Signature);

        SecurityTokenDescriptor tokenDescriptor = new()
        {
            Subject = new ClaimsIdentity(claims),
            SigningCredentials = creds,
            Issuer = _config["JWT:Issuer"],
            Audience = _config["JWT:Audience"],
        };

        JwtSecurityTokenHandler tokenHandler = new();

        SecurityToken securityToken = tokenHandler.CreateToken(tokenDescriptor);

        string token = tokenHandler.WriteToken(securityToken);

        await SaveAuthToken(userId, TokenUseType.Machine, jti, token);
        return token;
    }

    public async Task SaveAuthToken(string userId, TokenUseType tokenUseType, string jti, string token)
    {
        await _dbContext.AddAsync(new AuthToken
        {
            Jti = jti,
            Last5Digit = new string(token.TakeLast(5).ToArray()),
            TokenType = tokenUseType,
            CreatedByUserId = userId,
            Name = "",
        });

        await _dbContext.SaveChangesAsync();
    }

    public async Task<bool> ValidateTokenAsync(ClaimsPrincipal principal, CancellationToken cancellationToken = default)
    {
        string? accessType = principal.FindFirstValue(AuthClaimNames.AccessType);
        if (string.IsNullOrEmpty(accessType))
        {
            return false;
        }

        if (accessType == TokenUseType.ContentAccess.ToString() || accessType == TokenUseType.Upload.ToString())
        {
            return true;
        }

        string? jti = principal.FindFirstValue(JwtRegisteredClaimNames.Jti)
            ?? principal.FindFirstValue("jti");

        if (string.IsNullOrEmpty(jti))
        {
            return false;
        }

        AuthToken? authToken = await _dbContext.AuthTokens
            .FirstOrDefaultAsync(token => token.Jti == jti, cancellationToken);

        if (authToken is null || authToken.RevokedAt.HasValue)
        {
            return false;
        }

        if (authToken.ExpiresAt.HasValue && authToken.ExpiresAt.Value <= DateTime.UtcNow)
        {
            return false;
        }

        authToken.LastUsedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task RevokeTokenAsync(string? jti, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(jti))
        {
            return;
        }

        AuthToken? authToken = await _dbContext.AuthTokens
            .FirstOrDefaultAsync(token => token.Jti == jti, cancellationToken);

        if (authToken is null || authToken.RevokedAt.HasValue)
        {
            return;
        }

        authToken.RevokedAt = DateTime.UtcNow;
        authToken.LastUsedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
