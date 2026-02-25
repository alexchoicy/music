using Music.Core.Enums;

namespace Music.Core.Models;

public sealed class AlbumTrackDownloadItemModel
{
    public required int TrackId { get; init; }
    public required int DiscNumber { get; init; }
    public required int TrackNumber { get; init; }
    public required string TrackTitle { get; init; } = string.Empty;
    public required FileObjectVariant Variant { get; init; }
    public required string FileName { get; init; } = string.Empty;
    public required string Url { get; init; } = string.Empty;
}
