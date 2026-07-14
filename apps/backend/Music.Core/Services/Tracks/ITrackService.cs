namespace Music.Core.Services.Tracks;

public interface ITrackService
{
    Task<TrackPlaybackDetails?> GetPlaybackDetailsAsync(
        int trackId,
        CancellationToken cancellationToken = default
    );
}
