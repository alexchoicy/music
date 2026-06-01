using Music.Core.Storage;
using Music.Core.Services.Albums;
using Music.Core.Services.Albums.Enums;
using Music.Core.Services.Albums.Requests;
using Music.Core.Services.Albums.Results;
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
            .Images.Where(image => image.AlbumDiscId is null)
            .OrderByDescending(image => image.IsPrimary)
            .ThenBy(image => image.CreatedAt)
            .FirstOrDefault()
            .ToCoverVariants(assetsService);
    }

    public static AlbumCoverDetails ToAlbumCoverDetails(
        this Album album,
        IAssetsService assetsService
    )
    {
        List<AlbumDiscCoverDetails> discCovers = album
            .Discs.OrderBy(disc => disc.DiscNumber)
            .Select(disc => new AlbumDiscCoverDetails
            {
                AlbumDiscId = disc.Id,
                DiscNumber = disc.DiscNumber,
                Variants = album
                    .Images.Where(image => image.AlbumDiscId == disc.Id)
                    .OrderByDescending(image => image.IsPrimary)
                    .ThenBy(image => image.CreatedAt)
                    .FirstOrDefault()
                    .ToCoverVariants(assetsService),
            })
            .Where(discCover => discCover.Variants.Count > 0)
            .ToList();

        return new AlbumCoverDetails
        {
            Album = album.ToAlbumCoverVariants(assetsService),
            Discs = discCovers,
        };
    }

    private static IReadOnlyList<AlbumCoverVariant> ToCoverVariants(
        this AlbumImage? image,
        IAssetsService assetsService
    )
    {
        return image
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
