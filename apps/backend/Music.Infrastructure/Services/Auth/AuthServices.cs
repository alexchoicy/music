using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using Music.Core.Entities;
using Music.Core.Enums;
using Music.Core.Exceptions;
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

        UserInfo userInfo = new()
        {
            Id = user.Id,
            UserName = user.UserName!,
            Roles = roles
        };

        string token = _tokenService.GenerateUserToken(userInfo, roles);

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

    public async Task<UserInfo> CreateUserAsync(string username, string password, Roles role)
    {
        if (!Enum.IsDefined(role))
        {
            throw new ValidationException("Invalid role.");
        }

        User user = new()
        {
            UserName = username,
        };

        IdentityResult createResult = await _userManager.CreateAsync(user, password);
        if (!createResult.Succeeded)
        {
            if (createResult.Errors.Any(error => error.Code == nameof(IdentityErrorDescriber.DuplicateUserName)))
            {
                throw new ConflictException("Username already exists.");
            }

            string errorMessage = string.Join(" ", createResult.Errors.Select(error => error.Description));
            throw new ValidationException(errorMessage);
        }

        IdentityResult roleResult = await _userManager.AddToRoleAsync(user, role.ToString());
        if (!roleResult.Succeeded)
        {
            string errorMessage = string.Join(" ", roleResult.Errors.Select(error => error.Description));
            throw new ValidationException(errorMessage);
        }

        IList<string> roles = await _userManager.GetRolesAsync(user);

        return new UserInfo
        {
            Id = user.Id,
            UserName = user.UserName!,
            Roles = roles,
        };
    }
}
