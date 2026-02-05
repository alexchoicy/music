using Music.Core.Entities;
using Music.Core.Models;

namespace Music.Core.Services.Interfaces
{
    public interface ITokenService
    {
        string GenerateUserToken(UserInfo user, IList<string> roles);
        string GenerateShareToken(string shareId);
    }
}
