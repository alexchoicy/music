namespace Music.Api.Authentication;

public sealed class SessionCookie(IConfiguration configuration)
{
    private static readonly TimeSpan Lifetime = TimeSpan.FromDays(365);

    public string Name { get; } = configuration.GetValue<string>("Cookies:Name")!;
    private readonly string? _domain = configuration.GetValue<string>("Cookies:Domain");

    public void Append(HttpResponse response, string token)
    {
        CookieOptions options = CreateOptions();
        options.Expires = DateTimeOffset.UtcNow + Lifetime;
        response.Cookies.Append(Name, token, options);
    }

    public void Delete(HttpResponse response) => response.Cookies.Delete(Name, CreateOptions());

    private CookieOptions CreateOptions() =>
        new()
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = true,
            IsEssential = true,
            Domain = _domain,
        };
}
