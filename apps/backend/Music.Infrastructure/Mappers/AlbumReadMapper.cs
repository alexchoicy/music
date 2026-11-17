using Music.Core.Common.Enums;
using Music.Core.Entities;
using Music.Core.Services.Albums;
using Music.Core.Services.Albums.Enums;
using Music.Core.Services.Albums.Requests;
using Music.Core.Services.Albums.Results;
using Music.Core.Services.Files;
using Music.Core.Storage;

namespace Music.Infrastructure.Mappers;

internal static class AlbumReadMapper
{
    public static AlbumListItem ToListItem(
        this Album album,
        IAssetsService assetsService,
        int trackCount,
        int totalDurationInMs,
        IReadOnlyList<AlbumListMatchedTrack> matchedTracks
    )
    {
        return new AlbumListItem
        {
            AlbumId = album.Id,
            Title = album.Title,
            Description = album.Description,
            Type = album.Type,
            ReleaseDate = album.ReleaseDate,
            LanguageId = album.LanguageId,
            CreatedAt = album.CreatedAt,
            UpdatedAt = album.UpdatedAt,
            CoverVariants = ToAlbumCoverVariants(album, assetsService),
            DiscCovers = album
                .Discs.OrderBy(disc => disc.DiscNumber)
                .Select(disc => new AlbumDiscCoverDetails
                {
                    AlbumDiscId = disc.Id,
                    DiscNumber = disc.DiscNumber,
                    Variants = album.ToDiscImageVariants(disc.Id, assetsService),
                })
                .Where(discCover => discCover.Variants.Original is not null)
                .ToList(),
            Artists = album
                .Credits.Where(credit =>
                    credit.Credit == CreditType.Artist && credit.Party is not null
                )
                .OrderBy(credit => credit.Party!.Name)
                .Select(credit => new AlbumListArtist
                {
                    PartyId = credit.PartyId,
                    Name = credit.Party!.Name,
                })
                .ToList(),
            MatchedTracks = matchedTracks,
            TrackCount = trackCount,
            TotalDurationInMs = totalDurationInMs,
        };
    }

    public static ImageFileVariants ToAlbumCoverVariants(
        this Album album,
        IAssetsService assetsService
    )
    {
        return album
            .Images.Where(image => image.AlbumDiscId is null)
            .OrderByDescending(image => image.IsPrimary)
            .ThenBy(image => image.CreatedAt)
            .FirstOrDefault()
            .ToImageVariants(assetsService);
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
                Variants = album.ToDiscImageVariants(disc.Id, assetsService),
            })
            .Where(discCover => discCover.Variants.Original is not null)
            .ToList();

        return new AlbumCoverDetails
        {
            Album = album.ToAlbumCoverVariants(assetsService),
            Discs = discCovers,
        };
    }

    public static ImageFileVariants ToDiscCoverVariants(
        this Album album,
        int albumDiscId,
        IAssetsService assetsService
    )
    {
        ImageFileVariants disc = album.ToDiscImageVariants(albumDiscId, assetsService);
        return disc.Original is not null ? disc : album.ToAlbumCoverVariants(assetsService);
    }

    private static ImageFileVariants ToDiscImageVariants(
        this Album album,
        int albumDiscId,
        IAssetsService assetsService
    ) =>
        album
            .Images.Where(image => image.AlbumDiscId == albumDiscId)
            .OrderByDescending(image => image.IsPrimary)
            .ThenBy(image => image.CreatedAt)
            .FirstOrDefault()
            .ToImageVariants(assetsService);

    private static ImageFileVariants ToImageVariants(
        this AlbumImage? image,
        IAssetsService assetsService
    ) => image?.File.ToImageVariants(assetsService) ?? new ImageFileVariants();
}
