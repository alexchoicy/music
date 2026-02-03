using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Music.Core.Enums;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Services.Auth;

public interface ITokenService
{
    string GenerateUserToken(User user, IList<string> roles);
    string GenerateShareToken(string shareId);
}

public class TokenService : ITokenService
{
    private readonly IConfiguration _config;
    private readonly SymmetricSecurityKey _key;
    private readonly Logger<TokenService> _logger;

    public TokenService(IConfiguration config, Logger<TokenService> logger)
    {
        _logger = logger;
        _config = config;


        string? secret = _config["JWT:SecretKey"];

        if (string.IsNullOrWhiteSpace(secret))
        {
            _logger.LogCritical("JWT Secret Key is not configured. Refusing to start.");
            Environment.FailFast("Missing config: JWT:SecretKey");
        }

        _key = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(secret));
    }

    public string GenerateUserToken(User user, IList<string> roles)
    {
        List<Claim> claims =
           [
                new Claim(JwtRegisteredClaimNames.NameId, user.Id),
                new Claim(JwtRegisteredClaimNames.Name, user.UserName!),
                new Claim("access_type", TokenUseType.USERACCESS.ToString()),
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
        };

        JwtSecurityTokenHandler tokenHandler = new();

        SecurityToken token = tokenHandler.CreateToken(tokenDescriptor);

        return tokenHandler.WriteToken(token);
    }

    public string GenerateShareToken(string shareId)
    {
        List<Claim> claims =
           [
                new("share_id", shareId),
                new("access_type", TokenUseType.CONTENTACCESS.ToString()),
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

        SecurityToken token = tokenHandler.CreateToken(tokenDescriptor);

        return tokenHandler.WriteToken(token);
    }
}
