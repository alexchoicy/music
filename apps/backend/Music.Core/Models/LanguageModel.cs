namespace Music.Core.Models;

public sealed class LanguageModel
{
    public required int LanguageId { get; init; }
    public required string Name { get; init; } = string.Empty;
}
