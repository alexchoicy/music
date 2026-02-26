using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;
using Music.Core.Entities;
using Music.Core.Enums;
using Music.Core.Exceptions;
using Music.Core.Models;
using Music.Core.Services.Interfaces;
using Music.Core.Utils;
using Music.Infrastructure.Data;

namespace Music.Infrastructure.Services.Concert;

public sealed class ConcertService(
    AppDbContext dbContext,
    IContentService contentService,
    ILogger<ConcertService> logger) : IConcertService
{
    private readonly AppDbContext _dbContext = dbContext;
    private readonly IContentService _contentService = contentService;
    private readonly ILogger<ConcertService> _logger = logger;

    public async Task CreateConcertAsync(
        CreateConcertModel concert,
        string userId,
        CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();

        if (await ConcertExistsAsync(concert.Title, cancellationToken))
        {
            throw new ConflictException($"A concert with the title '{concert.Title}' already exists.");
        }


    }

    private async Task<bool> ConcertExistsAsync(string title, CancellationToken cancellationToken)
    {
        string normalizedInputTitle = StringUtils.NormalizeString(title);
        return await _dbContext.Concerts
            .AsNoTracking()
            .AnyAsync(c => c.NormalizedTitle == normalizedInputTitle, cancellationToken);
    }
}
