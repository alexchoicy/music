using Music.Core.Services.Parties;
using Music.Core.Services.Parties.Enums;
using Music.Core.Services.Parties.Requests;
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
            Kind = PartyKind.Human,
            Country = CountryCode.XX,
        };

        context.Parties.Add(unknownParty);
        await context.SaveChangesAsync();
    }
}
