using Music.Core.Enums;
using Music.Core.Models;

namespace Music.Core.Services.Interfaces;

public interface IAuthService
{
    Task<AuthSession?> LoginAsync(string emailOrUserName, string password);
    Task<UserInfo> CreateUserAsync(string username, string password, Roles role);
}
