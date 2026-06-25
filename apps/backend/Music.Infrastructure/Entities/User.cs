using Microsoft.AspNetCore.Identity;
using Music.Core.Entities;

namespace Music.Infrastructure.Entities;

public class User : IdentityUser
{
    public ICollection<Album> CreatedAlbums { get; set; } = [];
    public ICollection<Track> CreatedTracks { get; set; } = [];
    public ICollection<Concert> CreatedConcerts { get; set; } = [];
    public ICollection<TrackAudio> UploadedTrackAudios { get; set; } = [];

    public ICollection<StoredFile> UploadedFiles { get; set; } = [];

    public ICollection<AuthToken> AuthTokens { get; set; } = [];

    public ICollection<PartyExternalInfo> PartyExternalInfos { get; set; } = [];
    public ICollection<PartyImage> PartyImages { get; set; } = [];
}
