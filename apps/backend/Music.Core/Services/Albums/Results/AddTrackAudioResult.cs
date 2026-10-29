namespace Music.Core.Services.Albums.Results;

public sealed class AddTrackAudioResult
{
    public required AlbumEditDetails Album { get; init; }

    public required CreateAlbumTrackUploadItemResult Upload { get; init; }
}
