using Music.Api.Dtos.Requests;
using Music.Core.Models;

namespace Music.Api.Mappers;

public static class AlbumMapping
{
    public static CreateAlbumModel ToModel(this CreateAlbumRequest r) => new()
    {
        Title = r.Title,
        Description = r.Description,
        Type = r.Type,
        LanguageId = r.LanguageId,
        ReleaseDate = r.ReleaseDate,
        AlbumImage = r.AlbumImage?.ToModel(),
        AlbumCredits = r.AlbumCredits.Select(x => x.ToModel()).ToList(),
        Tracks = r.Tracks.Select(x => x.ToModel()).ToList(),
    };

    public static AlbumImageModel ToModel(this AlbumImageRequest r) => new()
    {
        Description = r.Description,
        File = r.File.ToModel(),
        FileCroppedArea = r.FileCroppedArea?.ToModel()
    };

    public static AlbumCreditModel ToModel(this AlbumCreditRequest r) => new()
    {
        PartyId = r.PartyId,
        Credit = r.Credit
    };

    public static AlbumTrackModel ToModel(this AlbumTrackRequest r) => new()
    {
        TrackNumber = r.TrackNumber,
        DiscNumber = r.DiscNumber,
        Title = r.Title,
        Description = r.Description,
        IsMC = r.IsMC,
        DurationInMs = r.DurationInMs,
        LanguageId = r.LanguageId,
        TrackCredits = r.TrackCredits.Select(x => x.ToModel()).ToList(),
        TrackVariants = r.TrackVariants.Select(x => x.ToModel()).ToList()
    };

    public static TrackCreditModel ToModel(this TrackCreditRequest r) => new()
    {
        PartyId = r.PartyId,
        Credit = r.Credit
    };

    public static TrackVariantModel ToModel(this TrackVariantRequest r) => new()
    {
        VariantType = r.VariantType,
        Sources = r.Sources.Select(x => x.ToModel()).ToList()
    };

    public static TrackSourceModel ToModel(this TrackSourceRequest r) => new()
    {
        Source = r.Source,
        File = r.File.ToModel()
    };
}
