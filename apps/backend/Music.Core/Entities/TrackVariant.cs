using Music.Core.Enums;

namespace Music.Core.Entities;

public class TrackVariant
{
    public int Id { get; set; }

    public int TrackId { get; set; }
    public Track? Track { get; set; }

    public TrackVariantType VariantType { get; set; } = TrackVariantType.Default;

    public ICollection<TrackSource> Sources { get; set; } = [];
}
