namespace Music.Core.Common.Constants;

public static class AuthClaimNames
{
    public const string AccessType = "accessType";
    public const string SessionId = "sid";
}

public static class AuthorizationPolicies
{
    public const string UserAllowed = "UserAllowed";
    public const string RequireAdminRole = "RequireAdminRole";
    public const string BotAllowed = "BotAllowed";
    public const string RequireUploaderRole = "RequireUploaderRole";
}
