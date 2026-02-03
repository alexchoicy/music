using Music.Core.Enum;
using Music.Infrastructure.Entities;

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
            Type = PartyType.INDIVIDUAL,
        };

        context.Parties.Add(unknownParty);
        await context.SaveChangesAsync();
    }
}
