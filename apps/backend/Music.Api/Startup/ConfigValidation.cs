namespace Music.Api.Startup;

public static class ConfigValidation
{
    public static void Validation(IConfiguration configuration)
    {
        CheckJWTSettings(configuration);
        CheckBaseSettings(configuration);
        CheckCookieSettings(configuration);
        CheckStorageSettings(configuration);
    }

    public static void CheckJWTSettings(IConfiguration configuration)
    {
        if (string.IsNullOrEmpty(configuration["JWT:SecretKey"]))
        {
            throw new Exception("JWT SecretKey is not configured.");
        }

        if (string.IsNullOrEmpty(configuration["JWT:Issuer"]))
        {
            throw new Exception("JWT Issuer is not configured.");
        }

        if (string.IsNullOrEmpty(configuration["JWT:Audience"]))
        {
            throw new Exception("JWT Audience is not configured.");
        }
    }

    public static void CheckBaseSettings(IConfiguration configuration)
    {
        if (string.IsNullOrEmpty(configuration["Base:ApiUrl"]))
        {
            throw new Exception("API Base URL is not configured.");
        }

        if (string.IsNullOrEmpty(configuration["Base:WebUrl"]))
        {
            throw new Exception("Web Base URL is not configured.");
        }
    }

    public static void CheckCookieSettings(IConfiguration configuration)
    {
        if (string.IsNullOrEmpty(configuration["Cookies:Name"]))
        {
            throw new Exception("Cookies Name is not configured.");
        }
    }

    public static void CheckStorageSettings(IConfiguration configuration)
    {
        if (string.IsNullOrEmpty(configuration["Storage:TempDir"]))
        {
            throw new Exception("Storage TempDir is not configured.");
        }
    }
}
