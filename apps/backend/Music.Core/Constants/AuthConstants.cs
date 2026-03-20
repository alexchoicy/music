namespace Music.Core.Constants;

public static class AuthClaimNames
{
    public const string AccessType = "accessType";
}

public static class AuthorizationPolicies
{
    public const string UserAllowed = "UserAllowed";
    public const string RequireAdminRole = "RequireAdminRole";
    public const string BotAllowed = "BotAllowed";
    public const string UploadAllowed = "UploadAllowed";
}
