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
        IReadOnlySet<int>? matchedTrackIds = null
    )
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
            DiscCovers = album
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
                        .ToImageVariants(assetsService),
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
            MatchedTracks = matchedTrackIds is null
                ? []
                : album
                    .Discs.SelectMany(disc =>
                        disc.Tracks.Where(albumTrack =>
                                albumTrack.Track is not null
                                && matchedTrackIds.Contains(albumTrack.TrackId)
                            )
                            .Select(albumTrack => new AlbumListMatchedTrack
                            {
                                TrackId = albumTrack.TrackId,
                                DiscNumber = disc.DiscNumber,
                                TrackNumber = albumTrack.TrackNumber,
                                Title = albumTrack.Track!.Title,
                                BasedOnTrackId = albumTrack.Track.BasedOnTrackId,
                                BasedOnTrackTitle = albumTrack.Track.BasedOnTrack?.Title,
                            })
                    )
                    .OrderBy(track => track.DiscNumber)
                    .ThenBy(track => track.TrackNumber)
                    .ToList(),
            TrackCount = album.Discs.Sum(disc => disc.Tracks.Count),
            TotalDurationInMs = album
                .Discs.SelectMany(disc => disc.Tracks)
                .Sum(track => track.Track?.DurationInMs ?? 0),
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
                Variants = album
                    .Images.Where(image => image.AlbumDiscId == disc.Id)
                    .OrderByDescending(image => image.IsPrimary)
                    .ThenBy(image => image.CreatedAt)
                    .FirstOrDefault()
                    .ToImageVariants(assetsService),
            })
            .Where(discCover => discCover.Variants.Original is not null)
            .ToList();

        return new AlbumCoverDetails
        {
            Album = album.ToAlbumCoverVariants(assetsService),
            Discs = discCovers,
        };
    }

    private static ImageFileVariants ToImageVariants(
        this AlbumImage? image,
        IAssetsService assetsService
    ) => image?.File.ToImageVariants(assetsService) ?? new ImageFileVariants();
}
