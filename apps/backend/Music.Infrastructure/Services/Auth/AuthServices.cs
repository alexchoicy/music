using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Music.Core.Common.Exceptions;
using Music.Core.Services.Auth;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Services.Auth;

public class AuthService(UserManager<User> userManager, ITokenService tokenService) : IAuthService
{
    private readonly UserManager<User> _userManager = userManager;
    private readonly ITokenService _tokenService = tokenService;

    public async Task<List<UserInfo>> GetUsersAsync()
    {
        List<User> users = await _userManager.Users.ToListAsync();

        List<UserInfo> userInfos = new(users.Count);
        foreach (User user in users)
        {
            IList<string> roles = await _userManager.GetRolesAsync(user);
            userInfos.Add(
                new UserInfo
                {
                    Id = user.Id,
                    UserName = user.UserName!,
                    Roles = roles,
                }
            );
        }

        return userInfos;
    }

    public async Task<UserInfo> CreateUserAsync(
        CreateUserRequest request,
        CancellationToken cancellationToken = default
    )
    {
        if (!Enum.IsDefined(request.Role))
        {
            throw new ValidationException("Invalid role.");
        }

        User user = new() { UserName = request.Username };

        IdentityResult createResult = await _userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            if (
                createResult.Errors.Any(error =>
                    error.Code == nameof(IdentityErrorDescriber.DuplicateUserName)
                )
            )
            {
                throw new ConflictException("Username already exists.");
            }

            string errorMessage = string.Join(
                " ",
                createResult.Errors.Select(error => error.Description)
            );
            throw new ValidationException(errorMessage);
        }

        IdentityResult roleResult = await _userManager.AddToRoleAsync(
            user,
            request.Role.ToString()
        );
        if (!roleResult.Succeeded)
        {
            string errorMessage = string.Join(
                " ",
                roleResult.Errors.Select(error => error.Description)
            );
            throw new ValidationException(errorMessage);
        }

        IList<string> roles = await _userManager.GetRolesAsync(user);

        return new UserInfo
        {
            Id = user.Id,
            UserName = user.UserName!,
            Roles = roles.ToList(),
        };
    }

    public async Task<UserInfo> UpdateUserAsync(
        string id,
        UpdateUserRequest request,
        CancellationToken cancellationToken = default
    )
    {
        User? user =
            await _userManager.FindByIdAsync(id)
            ?? throw new KeyNotFoundException("User not found.");

        if (request.Username != null)
        {
            user.UserName = request.Username;
            IdentityResult updateResult = await _userManager.UpdateAsync(user);
            if (!updateResult.Succeeded)
            {
                string errorMessage = string.Join(
                    " ",
                    updateResult.Errors.Select(error => error.Description)
                );
                throw new ValidationException(errorMessage);
            }
        }

        if (request.Password != null)
        {
            IdentityResult passwordResult = await _userManager.RemovePasswordAsync(user);

            if (!passwordResult.Succeeded)
            {
                string errorMessage = string.Join(
                    " ",
                    passwordResult.Errors.Select(error => error.Description)
                );
                throw new ValidationException(errorMessage);
            }

            passwordResult = await _userManager.AddPasswordAsync(user, request.Password);

            if (!passwordResult.Succeeded)
            {
                string errorMessage = string.Join(
                    " ",
                    passwordResult.Errors.Select(error => error.Description)
                );
                throw new ValidationException(errorMessage);
            }
        }

        if (request.Role.HasValue)
        {
            IList<string> currentRoles = await _userManager.GetRolesAsync(user);
            if (currentRoles.Count > 0)
            {
                await _userManager.RemoveFromRolesAsync(user, currentRoles);
            }
            await _userManager.AddToRoleAsync(user, request.Role.Value.ToString());
        }

        IList<string> roles = await _userManager.GetRolesAsync(user);

        await _tokenService.RevokeAllUserTokensAsync(user.Id, cancellationToken);

        return new UserInfo
        {
            Id = user.Id,
            UserName = user.UserName!,
            Roles = roles.ToList(),
        };
    }

    public async Task<LoginResult?> LoginAsync(string emailOrUserName, string password)
    {
        User? user = await _userManager.FindByNameAsync(emailOrUserName);
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
            Roles = roles.ToList(),
        };

        string token = await _tokenService.GenerateUserToken(userInfo);

        return new LoginResult { Token = token, User = userInfo };
    }
}
