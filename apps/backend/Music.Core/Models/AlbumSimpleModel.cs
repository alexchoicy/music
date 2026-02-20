namespace Music.Core.Models;

public sealed class AlbumSimpleModel
{
    public required string Title { get; init; } = string.Empty;
    public required IReadOnlyList<string> Credits { get; init; } = [];
    public required string CoverUrl { get; init; } = string.Empty;
}
