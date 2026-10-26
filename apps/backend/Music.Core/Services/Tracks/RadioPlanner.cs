namespace Music.Core.Services.Tracks;

public sealed record RadioPlanInput
{
    public required RadioProfile Profile { get; init; }
    public required IReadOnlyCollection<RadioCandidate> Candidates { get; init; }
    public required IReadOnlyList<RadioTrackInfo> Sequence { get; init; }
    public required IReadOnlyDictionary<int, int> ArtistPlayCounts { get; init; }
    public required int Count { get; init; }
    public required DateTimeOffset Now { get; init; }
}

public sealed class RadioPlanner
{
    private const double AffinityWeight = 0.6;
    private const double HistoryWeight = 0.2;
    private const double LanguageWeight = 0.1;
    private const double FreshnessWeight = 0.1;
    private const double RecentlyPlayedPenalty = 0.3;
    private const double FreshnessHalfLifeHours = 168;
    private const int ShortlistSize = 8;

    private static readonly TimeSpan RecentlyPlayedWindow = TimeSpan.FromHours(24);

    private static readonly (RadioTrackReason Reason, double Share)[] Sources =
    [
        (RadioTrackReason.SameArtist, 0.4),
        (RadioTrackReason.RelatedArtist, 0.4),
        (RadioTrackReason.Discovery, 0.2),
    ];

    private static readonly DiversityRule[] RelaxationLevels =
    [
        new(ArtistGap: 3, AlbumGap: 4),
        new(ArtistGap: 2, AlbumGap: 2),
        new(ArtistGap: 1, AlbumGap: 1),
        new(ArtistGap: 0, AlbumGap: 0),
    ];

    private readonly RadioPlanInput input;
    private readonly Random random;
    private readonly double maxArtistWeight;
    private readonly double maxLanguageWeight;
    private readonly int maxArtistPlays;
    private readonly List<ScoredCandidate>[] pools;
    private readonly List<RadioTrackInfo> sequence;
    private readonly HashSet<int> pickedTrackIds = [];
    private readonly Dictionary<int, int> batchArtistCounts = [];
    private readonly int[] sourceCounts = new int[Sources.Length];
    private readonly List<RadioTrack> batch = [];

    private RadioPlanner(RadioPlanInput input, Random random)
    {
        this.input = input;
        this.random = random;
        maxArtistWeight = input.Profile.ArtistWeights.Values.DefaultIfEmpty(0).Max();
        maxLanguageWeight = input.Profile.LanguageWeights.Values.DefaultIfEmpty(0).Max();
        maxArtistPlays = input.ArtistPlayCounts.Values.DefaultIfEmpty(0).Max();
        sequence = [.. input.Sequence];
        pools = Sources.Select(_ => new List<ScoredCandidate>()).ToArray();
    }

    public static IReadOnlyList<RadioTrack> Plan(RadioPlanInput input, Random random)
    {
        RadioPlanner planner = new(input, random);
        planner.FillPools();
        planner.FillBatch();
        return planner.batch;
    }

    private void FillPools()
    {
        foreach (
            RadioCandidate candidate in input.Candidates.DistinctBy(item => item.Track.TrackId)
        )
        {
            double sameArtist = Affinity(candidate, input.Profile.ArtistWeights);
            double relatedArtist = Affinity(candidate, input.Profile.RelatedArtistWeights);
            if (sameArtist > 0)
                pools[0].Add(new ScoredCandidate(candidate, Score(candidate, sameArtist)));
            if (relatedArtist > 0)
                pools[1].Add(new ScoredCandidate(candidate, Score(candidate, relatedArtist)));
            if (sameArtist <= 0)
                pools[2].Add(new ScoredCandidate(candidate, Score(candidate, relatedArtist)));
        }
    }

    private void FillBatch()
    {
        while (batch.Count < input.Count)
        {
            (int Source, RadioCandidate Candidate)? pick = null;
            foreach (DiversityRule rule in RelaxationLevels)
            {
                pick = TryPick(rule);
                if (pick is not null)
                    break;
            }
            if (pick is not (int source, RadioCandidate chosen))
                break;

            Add(source, chosen);
        }
    }

    private void Add(int source, RadioCandidate chosen)
    {
        pickedTrackIds.Add(chosen.Track.TrackId);
        sequence.Add(chosen.Track);
        sourceCounts[source]++;
        foreach (int artistId in chosen.Track.ArtistIds)
            batchArtistCounts[artistId] = batchArtistCounts.GetValueOrDefault(artistId) + 1;
        batch.Add(
            new RadioTrack
            {
                AlbumId = chosen.Release.AlbumId,
                AlbumDiscId = chosen.Release.AlbumDiscId,
                TrackId = chosen.Track.TrackId,
                Reason = Sources[source].Reason,
            }
        );
    }

    private double Affinity(RadioCandidate candidate, IReadOnlyDictionary<int, double> weights) =>
        maxArtistWeight <= 0
            ? 0
            : candidate
                .Track.ArtistIds.Select(artistId => weights.GetValueOrDefault(artistId))
                .DefaultIfEmpty(0)
                .Max() / maxArtistWeight;

    private double Score(RadioCandidate candidate, double affinity)
    {
        double artistPreference =
            maxArtistPlays == 0
                ? 0
                : candidate
                    .Track.ArtistIds.Select(artistId =>
                        Math.Log(1 + input.ArtistPlayCounts.GetValueOrDefault(artistId))
                        / Math.Log(1 + maxArtistPlays)
                    )
                    .DefaultIfEmpty(0)
                    .Max();
        double history = 0.5 + 0.5 * artistPreference;

        double language =
            candidate.Track.LanguageId is not int languageId || maxLanguageWeight <= 0
                ? 0.5
                : input.Profile.LanguageWeights.GetValueOrDefault(languageId) / maxLanguageWeight;

        double freshness = 1;
        bool recentlyPlayed = false;
        if (candidate.LastPlayedAt is DateTimeOffset lastPlayedAt)
        {
            TimeSpan sincePlayed = input.Now - lastPlayedAt;
            recentlyPlayed = sincePlayed < RecentlyPlayedWindow;
            double recency =
                1 - Math.Pow(0.5, Math.Max(0, sincePlayed.TotalHours) / FreshnessHalfLifeHours);
            freshness = recency / (1 + 0.25 * Math.Log(1 + candidate.PlayCount));
        }

        double score =
            AffinityWeight * affinity
            + HistoryWeight * history
            + LanguageWeight * language
            + FreshnessWeight * freshness;
        return Math.Max(score * (recentlyPlayed ? RecentlyPlayedPenalty : 1), 0.001);
    }

    private (int Source, RadioCandidate Candidate)? TryPick(DiversityRule rule)
    {
        IEnumerable<int> sourceOrder = Enumerable
            .Range(0, Sources.Length)
            .OrderByDescending(index =>
                Sources[index].Share * (batch.Count + 1) - sourceCounts[index]
            );
        foreach (int source in sourceOrder)
        {
            (RadioCandidate Candidate, double Weight)[] shortlist = pools[source]
                .Where(item =>
                    !pickedTrackIds.Contains(item.Candidate.Track.TrackId)
                    && IsAllowed(item.Candidate.Track, rule)
                )
                .Select(item =>
                    (item.Candidate, Weight: item.Score / (1 + BatchArtistCount(item.Candidate)))
                )
                .OrderByDescending(item => item.Weight)
                .Take(ShortlistSize)
                .ToArray();
            if (shortlist.Length > 0)
                return (source, PickWeighted(shortlist, random));
        }
        return null;
    }

    private int BatchArtistCount(RadioCandidate candidate) =>
        candidate
            .Track.ArtistIds.Select(artistId => batchArtistCounts.GetValueOrDefault(artistId))
            .DefaultIfEmpty(0)
            .Max();

    private bool IsAllowed(RadioTrackInfo track, DiversityRule rule) =>
        !Recent(rule.ArtistGap).Any(item => item.ArtistIds.Intersect(track.ArtistIds).Any())
        && !Recent(rule.AlbumGap).Any(item => item.AlbumIds.Intersect(track.AlbumIds).Any());

    private IEnumerable<RadioTrackInfo> Recent(int count) => sequence.TakeLast(count);

    private static RadioCandidate PickWeighted(
        (RadioCandidate Candidate, double Weight)[] shortlist,
        Random random
    )
    {
        double total = shortlist.Sum(item => item.Weight * item.Weight);
        double target = random.NextDouble() * total;
        foreach ((RadioCandidate candidate, double weight) in shortlist)
        {
            target -= weight * weight;
            if (target <= 0)
                return candidate;
        }
        return shortlist[^1].Candidate;
    }

    private sealed record ScoredCandidate(RadioCandidate Candidate, double Score);

    private sealed record DiversityRule(int ArtistGap, int AlbumGap);
}
