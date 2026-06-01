using Music.Core.Entities;

namespace Music.Infrastructure.Data.Seed;

public class LanguageSeed
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (context.Languages.Any())
            return;

        Language[] languages =
        [
            new() { Name = "Cantonese" },
            new() { Name = "Mandarin" },
            new() { Name = "Japanese" },
            new() { Name = "Korean" },
            new() { Name = "English" },
        ];

        context.Languages.AddRange(languages);
        await context.SaveChangesAsync();
    }
}
