using Microsoft.AspNetCore.Identity;
using Music.Core.Models;
using Music.Core.Services.Interfaces;
using Music.Infrastructure.Entities;

namespace Music.Infrastructure.Services.Me;

public class MeService(UserManager<User> userManager) : IMeService
{
    private readonly UserManager<User> _userManager = userManager;

    public async Task<UserInfo?> GetCurrentUserAsync(string userId)
    {
        User? user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return null;
        }

        IList<string> roles = await _userManager.GetRolesAsync(user);

        return new UserInfo
        {
            Id = user.Id,
            UserName = user.UserName!,
            Roles = roles
        };
    }
}
