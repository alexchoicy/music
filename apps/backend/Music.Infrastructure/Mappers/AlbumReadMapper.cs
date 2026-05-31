using Music.Core.Application.Storage;
using Music.Core.Domain.Albums;
using Music.Core.Entities;

namespace Music.Infrastructure.Mappers;

internal static class AlbumReadMapper
{
    public static AlbumListItem ToListItem(this Album album, IAssetsService assetsService)
    {
        return new AlbumListItem
        {
            AlbumId = album.Id,
            Title = album.Title,
            Description = album.Description,
            Type = album.Type,
            ReleaseDate = album.ReleaseDate,
            CreatedAt = album.CreatedAt,
            UpdatedAt = album.UpdatedAt,
            CoverVariants = ToAlbumCoverVariants(album, assetsService),
            Artists = album
                .Credits.Where(credit =>
                    credit.Credit == AlbumCreditType.Artist && credit.Party is not null
                )
                .OrderBy(credit => credit.Party!.Name)
                .Select(credit => new AlbumListArtist
                {
                    PartyId = credit.PartyId,
                    Name = credit.Party!.Name,
                })
                .ToList(),
            TrackCount = album.Discs.Sum(disc => disc.Tracks.Count),
            TotalDurationInMs = album
                .Discs.SelectMany(disc => disc.Tracks)
                .Sum(track => track.Track?.DurationInMs ?? 0),
        };
    }

    public static IReadOnlyList<AlbumCoverVariant> ToAlbumCoverVariants(
        this Album album,
        IAssetsService assetsService
    )
    {
        return album
                .Images.FirstOrDefault()
                ?.File?.FileObjects.OrderBy(fileObject => fileObject.FileObjectVariant)
                .Select(fileObject => new AlbumCoverVariant
                {
                    Variant = fileObject.FileObjectVariant,
                    Url = assetsService.GetUrl(fileObject.StoragePath),
                })
                .ToList()
            ?? [];
    }
}
