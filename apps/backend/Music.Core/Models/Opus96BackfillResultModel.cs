namespace Music.Core.Models;

public sealed class Opus96BackfillResultModel
{
    public required int ScannedTrackSources { get; init; }
    public required int EligibleTrackSources { get; init; }
    public required int UniqueOriginalFileObjects { get; init; }
    public required int QueuedJobs { get; init; }
    public required int SkippedTrackSources { get; init; }
}
