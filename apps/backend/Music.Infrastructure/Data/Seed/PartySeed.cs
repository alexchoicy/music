using Music.Core.Entities;
using Music.Core.Services.Parties.Enums;

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
            Kind = PartyKind.Human,
            Country = CountryCode.XX,
            Description = "",
        };

        context.Parties.Add(unknownParty);
        await context.SaveChangesAsync();
    }
}
