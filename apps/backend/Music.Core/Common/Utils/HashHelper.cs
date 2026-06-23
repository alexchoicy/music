using System.Text.RegularExpressions;

namespace Music.Core.Common.Utils;

public static class HashHelper
{
    public static bool ValidateBlake3Hash(string hash)
    {
        return !string.IsNullOrWhiteSpace(hash) && Regex.IsMatch(hash, "^[a-fA-F0-9]{64}$");
    }
}
