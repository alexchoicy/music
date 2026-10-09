namespace Music.Core.Entities;

public class ExtraConcert
{
    public Guid ExtraId { get; set; }
    public Extra? Extra { get; set; }

    public int ConcertId { get; set; }
    public Concert? Concert { get; set; }
}
