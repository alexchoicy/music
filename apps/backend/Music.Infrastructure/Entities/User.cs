using Microsoft.AspNetCore.Identity;

namespace Music.Infrastructure.Entities;

public class User : IdentityUser
{
    public ICollection<Album> CreatedAlbums { get; set; } = [];
    public ICollection<Track> CreatedTracks { get; set; } = [];
    public ICollection<TrackSource> UploadedTrackSources { get; set; } = [];

    public ICollection<FileObject> CreatedFileObjects { get; set; } = [];
}
