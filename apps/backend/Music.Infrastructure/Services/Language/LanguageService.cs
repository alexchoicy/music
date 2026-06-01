using Microsoft.EntityFrameworkCore;
using Music.Core.Services.Languages;
using Music.Infrastructure.Data;

namespace Music.Infrastructure.Services.Language;

public class LanguageService(AppDbContext dbContext) : ILanguageService
{
    private readonly AppDbContext _dbContext = dbContext;

    public async Task<IReadOnlyList<LanguageListItem>> GetAllAsync(
        CancellationToken cancellationToken = default
    )
    {
        return await _dbContext
            .Languages.AsNoTracking()
            .Select(language => new LanguageListItem
            {
                Id = language.Id,
                Language = language.Name,
            })
            .ToListAsync(cancellationToken);
    }
}
