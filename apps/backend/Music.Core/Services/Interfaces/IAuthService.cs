using Music.Core.Models;

namespace Music.Core.Services.Interfaces;

public interface IAuthService
{
    Task<AuthSession?> LoginAsync(string emailOrUserName, string password);
}
