using Microsoft.AspNetCore.Identity;
using Music.Core.Models;
using Music.Core.Services.Interfaces;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Services.Auth;

public class AuthService(UserManager<User> userManager, ITokenService tokenService) : IAuthService
{
    private readonly UserManager<User> _userManager = userManager;
    private readonly ITokenService _tokenService = tokenService;

    public async Task<AuthSession?> LoginAsync(string username, string password)
    {
        User? user = await _userManager.FindByNameAsync(username);
        if (user == null)
        {
            return null;
        }

        bool isPasswordValid = await _userManager.CheckPasswordAsync(user, password);
        if (!isPasswordValid)
        {
            return null;
        }

        IList<string> roles = await _userManager.GetRolesAsync(user);

        string token = _tokenService.GenerateUserToken(user, roles);

        return new AuthSession
        {
            Token = token,
            User = new UserInfo
            {
                Id = user.Id,
                UserName = user.UserName!,
                Roles = roles
            }
        };
    }
}
