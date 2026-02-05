using Music.Core.Enums;
using Music.Core.Entities;

namespace Music.Infrastructure.Data.Seed;

public class PartySeed
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (context.Parties.Any())
            return;

        Party unknownParty = new()
        {
            Name = "Unknown",
            Type = PartyType.Individual,
        };

        context.Parties.Add(unknownParty);
        await context.SaveChangesAsync();
    }
}
