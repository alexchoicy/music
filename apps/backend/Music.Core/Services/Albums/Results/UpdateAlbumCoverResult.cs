namespace Music.Core.Services.Albums.Results;

public sealed class UpdateAlbumCoverResult
{
    public required AlbumEditDetails Album { get; init; }

    // Set when a new image still needs its bytes uploaded
    public CreateAlbumImageUploadItemResult? Upload { get; init; }
}
