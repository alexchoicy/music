using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Music.Core.Common.Exceptions;
using Music.Core.Services.Auth;
using Music.Core.Services.Auth.Enums;
using Music.Infrastructure.Data;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Services.Auth;

public class AuthService(
    UserManager<User> userManager,
    SignInManager<User> signInManager,
    ISessionService sessionService,
    AppDbContext dbContext
) : IAuthService
{
    private readonly AppDbContext _dbContext = dbContext;
    private readonly UserManager<User> _userManager = userManager;
    private readonly SignInManager<User> _signInManager = signInManager;
    private readonly ISessionService _sessionService = sessionService;

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

    public async Task<UserInfo?> GetUserAsync(string id)
    {
        User? user = await _userManager.FindByIdAsync(id);
        return user is null ? null : await ToUserInfoAsync(user);
    }

    public async Task<UserInfo> CreateUserAsync(
        CreateUserRequest request,
        CancellationToken cancellationToken = default
    )
    {
        EnsureDefinedRole(request.Role);

        User user = new() { UserName = request.Username };

        await using IDbContextTransaction transaction =
            await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        EnsureSucceeded(await _userManager.CreateAsync(user, request.Password));
        EnsureSucceeded(await _userManager.AddToRoleAsync(user, request.Role.ToString()));
        await transaction.CommitAsync(cancellationToken);

        return await ToUserInfoAsync(user);
    }

    public async Task<UserInfo> UpdateUserAsync(
        string id,
        UpdateUserRequest request,
        CancellationToken cancellationToken = default
    )
    {
        if (request.Role is { } role)
        {
            EnsureDefinedRole(role);
        }

        User user =
            await _userManager.FindByIdAsync(id)
            ?? throw new EntityNotFoundException("User not found.");

        if (request.Password != null)
        {
            foreach (IPasswordValidator<User> validator in _userManager.PasswordValidators)
            {
                EnsureSucceeded(
                    await validator.ValidateAsync(_userManager, user, request.Password)
                );
            }
        }

        await using IDbContextTransaction transaction =
            await _dbContext.Database.BeginTransactionAsync(cancellationToken);

        if (request.Username != null)
        {
            user.UserName = request.Username;
            EnsureSucceeded(await _userManager.UpdateAsync(user));
        }

        if (request.Password != null)
        {
            EnsureSucceeded(await _userManager.RemovePasswordAsync(user));
            EnsureSucceeded(await _userManager.AddPasswordAsync(user, request.Password));

            await _sessionService.RevokeUserSessionsAsync(user.Id, cancellationToken);
        }

        if (request.Role is { } newRole)
        {
            IList<string> currentRoles = await _userManager.GetRolesAsync(user);
            if (currentRoles.Count > 0)
            {
                EnsureSucceeded(await _userManager.RemoveFromRolesAsync(user, currentRoles));
            }
            EnsureSucceeded(await _userManager.AddToRoleAsync(user, newRole.ToString()));
        }

        await transaction.CommitAsync(cancellationToken);

        return await ToUserInfoAsync(user);
    }

    private static void EnsureDefinedRole(Roles role)
    {
        if (!Enum.IsDefined(role))
        {
            throw new ValidationException("Invalid role.");
        }
    }

    private static void EnsureSucceeded(IdentityResult result)
    {
        if (result.Succeeded)
        {
            return;
        }

        if (
            result.Errors.Any(error =>
                error.Code == nameof(IdentityErrorDescriber.DuplicateUserName)
            )
        )
        {
            throw new ConflictException("Username already exists.");
        }

        throw new ValidationException(
            string.Join(" ", result.Errors.Select(error => error.Description))
        );
    }

    public async Task<UserInfo?> PasswordSignInAsync(string userName, string password)
    {
        User? user = await _userManager.FindByNameAsync(userName);
        if (user == null)
        {
            return null;
        }

        SignInResult result = await _signInManager.CheckPasswordSignInAsync(
            user,
            password,
            lockoutOnFailure: true
        );

        return result.Succeeded ? await ToUserInfoAsync(user) : null;
    }

    public async Task<UserInfo?> PasskeySignInAsync(string credentialJson)
    {
        PasskeyAssertionResult<User> assertion;
        try
        {
            assertion = await _signInManager.PerformPasskeyAssertionAsync(credentialJson);
        }
        catch (InvalidOperationException)
        {
            return null;
        }

        if (!assertion.Succeeded)
        {
            return null;
        }

        IdentityResult stored = await _userManager.AddOrUpdatePasskeyAsync(
            assertion.User,
            assertion.Passkey
        );

        return stored.Succeeded ? await ToUserInfoAsync(assertion.User) : null;
    }

    private async Task<UserInfo> ToUserInfoAsync(User user)
    {
        IList<string> roles = await _userManager.GetRolesAsync(user);

        return new UserInfo
        {
            Id = user.Id,
            UserName = user.UserName!,
            Roles = roles.ToList(),
        };
    }
}
