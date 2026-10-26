using Music.Core.Services.Parties.Enums;

namespace Music.Core.Services.Tracks;

public sealed class RadioProfile
{
    private const double SeedInfluence = 0.7;
    private const double CollaborationStrength = 0.6;

    private RadioProfile(
        IReadOnlyDictionary<int, double> artistWeights,
        IReadOnlyDictionary<int, double> languageWeights,
        IReadOnlyDictionary<int, double> relatedArtistWeights
    )
    {
        ArtistWeights = artistWeights;
        LanguageWeights = languageWeights;
        RelatedArtistWeights = relatedArtistWeights;
    }

    public IReadOnlyDictionary<int, double> ArtistWeights { get; }
    public IReadOnlyDictionary<int, double> LanguageWeights { get; }
    public IReadOnlyDictionary<int, double> RelatedArtistWeights { get; }

    public static RadioProfile Create(
        IReadOnlyCollection<RadioTrackInfo> seeds,
        IReadOnlyCollection<RadioTrackInfo> playedRadio
    )
    {
        double seedInfluence =
            playedRadio.Count == 0 ? 1
            : seeds.Count == 0 ? 0
            : SeedInfluence;

        return new RadioProfile(
            Blend(seeds, playedRadio, seedInfluence, track => track.ArtistIds),
            Blend(
                seeds,
                playedRadio,
                seedInfluence,
                track => track.LanguageId is int languageId ? [languageId] : []
            ),
            new Dictionary<int, double>()
        );
    }

    public RadioProfile WithRelatedArtists(
        IReadOnlyCollection<RadioPartyLink> links,
        IReadOnlyCollection<RadioCollaboration> collaborations
    )
    {
        Dictionary<int, double> related = [];
        Dictionary<(int PartyId, PartyRelationshipType Type), double> seedGroups = [];

        foreach (RadioPartyLink link in links)
        {
            if (ArtistWeights.TryGetValue(link.MemberId, out double memberWeight))
            {
                AddRelated(related, link.PartyId, DirectStrength(link.Type) * memberWeight);
                seedGroups[(link.PartyId, link.Type)] = Math.Max(
                    seedGroups.GetValueOrDefault((link.PartyId, link.Type)),
                    memberWeight
                );
            }
            if (ArtistWeights.TryGetValue(link.PartyId, out double partyWeight))
                AddRelated(related, link.MemberId, DirectStrength(link.Type) * partyWeight);
        }

        foreach (RadioPartyLink link in links)
        {
            if (seedGroups.TryGetValue((link.PartyId, link.Type), out double groupWeight))
                AddRelated(related, link.MemberId, SiblingStrength(link.Type) * groupWeight);
        }

        foreach (RadioCollaboration collaboration in collaborations)
        {
            if (ArtistWeights.TryGetValue(collaboration.SeedPartyId, out double weight))
                AddRelated(related, collaboration.PartyId, CollaborationStrength * weight);
        }

        return new RadioProfile(ArtistWeights, LanguageWeights, related);
    }

    private void AddRelated(Dictionary<int, double> related, int partyId, double weight)
    {
        if (weight <= 0 || ArtistWeights.ContainsKey(partyId))
            return;
        related[partyId] = Math.Max(related.GetValueOrDefault(partyId), weight);
    }

    private static double DirectStrength(PartyRelationshipType type) =>
        type switch
        {
            PartyRelationshipType.MemberOf => 0.9,
            PartyRelationshipType.VoiceActorOf => 0.8,
            PartyRelationshipType.AffiliatedWith => 0.3,
            _ => 0,
        };

    private static double SiblingStrength(PartyRelationshipType type) =>
        type switch
        {
            PartyRelationshipType.MemberOf => 0.7,
            PartyRelationshipType.AffiliatedWith => 0.2,
            _ => 0,
        };

    private static Dictionary<int, double> Blend(
        IReadOnlyCollection<RadioTrackInfo> seeds,
        IReadOnlyCollection<RadioTrackInfo> playedRadio,
        double seedInfluence,
        Func<RadioTrackInfo, IEnumerable<int>> keys
    )
    {
        Dictionary<int, double> weights = [];
        AddShare(weights, seeds, seedInfluence, keys);
        AddShare(weights, playedRadio, 1 - seedInfluence, keys);
        return weights;
    }

    private static void AddShare(
        Dictionary<int, double> weights,
        IReadOnlyCollection<RadioTrackInfo> tracks,
        double influence,
        Func<RadioTrackInfo, IEnumerable<int>> keys
    )
    {
        if (tracks.Count == 0 || influence <= 0)
            return;
        foreach (int key in tracks.SelectMany(track => keys(track).Distinct()))
            weights[key] = weights.GetValueOrDefault(key) + influence / tracks.Count;
    }
}
