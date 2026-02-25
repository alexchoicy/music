using Music.Core.Models;

namespace Music.Core.Services.Interfaces;

public interface IMeService
{
    Task<UserInfo?> GetCurrentUserAsync(string userId);
}
