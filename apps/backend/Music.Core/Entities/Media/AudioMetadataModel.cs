namespace Music.Core.Media
{
    public sealed class AudioMetadataModel
    {
        public string? Title { get; init; }
        public string? Album { get; init; }

        public IReadOnlyList<string> Artists { get; init; } = [];
        public IReadOnlyList<string> AlbumArtists { get; init; } = [];

        public int? TrackNumber { get; init; }
        public int? DiscNumber { get; init; }

        public DateTimeOffset? ReleaseDate { get; init; }
    }
}
