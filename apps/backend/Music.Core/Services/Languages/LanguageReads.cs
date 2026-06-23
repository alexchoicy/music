namespace Music.Core.Services.Languages;

public sealed class LanguageListItem
{
    public required int Id { get; init; }

    public required string Language { get; init; } = string.Empty;
}
