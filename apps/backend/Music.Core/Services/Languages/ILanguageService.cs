namespace Music.Core.Services.Languages;

public interface ILanguageService
{
    Task<IReadOnlyList<LanguageListItem>> GetAllAsync(
        CancellationToken cancellationToken = default
    );
}
