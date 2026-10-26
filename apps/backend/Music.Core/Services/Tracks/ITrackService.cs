namespace Music.Core.Services.Tracks;

public interface ITrackService
{
    Task<TrackPlaybackDetails?> GetPlaybackDetailsAsync(
        int trackId,
        CancellationToken cancellationToken = default
    );

    Task<IReadOnlyList<RadioTrack>> GetRadioTracksAsync(
        RadioTrackRequest request,
        string userId,
        CancellationToken cancellationToken = default
    );
}
