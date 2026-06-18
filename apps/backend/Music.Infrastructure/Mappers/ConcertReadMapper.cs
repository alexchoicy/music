using Music.Core.Entities;
using Music.Core.Services.Concerts;
using Music.Core.Services.Files.Enums;
using Music.Core.Storage;

namespace Music.Infrastructure.Mappers;

internal static class ConcertReadMapper
{
    public static ConcertListItem ToListItem(this Concert concert, IAssetsService assetsService)
    {
        return new ConcertListItem
        {
            ConcertId = concert.Id,
            Title = concert.Title,
            Description = concert.Description,
            Date = concert.Date,
            CoverVariants = concert.ToConcertCoverVariants(assetsService),
            Parties = concert.ConcertParties.ToConcertPartySummaries(),
            AlbumCount = concert.ConcertAlbums.Count,
            FileCount = concert.ConcertFiles.Count,
            CreatedAt = concert.CreatedAt,
            UpdatedAt = concert.UpdatedAt,
        };
    }

    public static ConcertDetails ToDetails(
        this Concert concert,
        IContentService contentService,
        IAssetsService assetsService
    )
    {
        return new ConcertDetails
        {
            ConcertId = concert.Id,
            Title = concert.Title,
            Description = concert.Description,
            Date = concert.Date,
            CoverVariants = concert.ToConcertCoverVariants(assetsService),
            LinkedParties = concert.ConcertParties.ToConcertPartySummaries(),
            LinkedAlbums = concert
                .ConcertAlbums.Where(concertAlbum => concertAlbum.Album is not null)
                .OrderBy(concertAlbum => concertAlbum.Album!.Title)
                .Select(concertAlbum => concertAlbum.Album!.ToListItem(assetsService))
                .ToList(),
            Files = concert
                .ConcertFiles.OrderBy(concertFile => concertFile.Order)
                .ThenBy(concertFile => concertFile.Title)
                .Select(concertFile => new ConcertFileDetails
                {
                    ConcertFileId = concertFile.Id,
                    Title = concertFile.Title,
                    Type = concertFile.Type,
                    Order = concertFile.Order,
                    File = concertFile.File.ToConcertFileVariants(contentService, assetsService),
                })
                .ToList(),
            CreatedAt = concert.CreatedAt,
            UpdatedAt = concert.UpdatedAt,
        };
    }

    public static IReadOnlyList<ConcertCoverVariant> ToConcertCoverVariants(
        this Concert concert,
        IAssetsService assetsService
    )
    {
        return concert
                .Images?.OrderByDescending(image => image.IsPrimary)
                .ThenBy(image => image.CreatedAt)
                .FirstOrDefault()
                ?.File?.FileObjects.OrderBy(fileObject => fileObject.FileObjectVariant)
                .Select(fileObject => new ConcertCoverVariant
                {
                    Variant = fileObject.FileObjectVariant,
                    Url = assetsService.GetUrl(fileObject.StoragePath),
                })
                .ToList()
            ?? [];
    }

    public static IReadOnlyList<ConcertPartySummary> ToConcertPartySummaries(
        this IEnumerable<ConcertParty> concertParties
    )
    {
        return concertParties
            .Where(concertParty => concertParty.Party is not null)
            .OrderBy(concertParty => concertParty.Role)
            .ThenBy(concertParty => concertParty.Party!.Name)
            .Select(concertParty => new ConcertPartySummary
            {
                PartyId = concertParty.PartyId,
                Name = concertParty.Party!.Name,
                Type = concertParty.Party!.Type,
                Role = concertParty.Role,
            })
            .ToList();
    }

    public static ConcertFileVariants ToConcertFileVariants(
        this StoredFile? storedFile,
        IContentService contentService,
        IAssetsService assetsService
    )
    {
        if (storedFile?.FileObjects is null)
            throw new InvalidOperationException("Concert file is missing file objects");

        FileObject? original = storedFile.FileObjects.FirstOrDefault(fileObject =>
            fileObject.FileObjectVariant == FileObjectVariant.Original
        );

        if (original is null)
            throw new InvalidOperationException(
                "Concert file is missing Original file object variant"
            );

        return new ConcertFileVariants
        {
            Original = original.ToContentDetails(contentService),
            DashAV1 = storedFile
                .FileObjects.Where(fileObject =>
                    fileObject.FileObjectVariant == FileObjectVariant.DashAV1
                )
                .Select(fileObject => fileObject.ToContentDetails(contentService, true))
                .FirstOrDefault(),
            Thumbnail640x360 = storedFile
                .FileObjects.Where(fileObject =>
                    fileObject.FileObjectVariant == FileObjectVariant.Thumbnail640x360
                )
                .Select(fileObject => fileObject.ToAssetDetails(assetsService))
                .FirstOrDefault(),
            AttachedPicture = storedFile
                .FileObjects.Where(fileObject =>
                    fileObject.FileObjectVariant == FileObjectVariant.AttachedPicture
                )
                .Select(fileObject => fileObject.ToAssetDetails(assetsService))
                .FirstOrDefault(),
            SubtitleVtt = storedFile
                .FileObjects.Where(fileObject =>
                    fileObject.FileObjectVariant == FileObjectVariant.SubtitleVtt
                )
                .Select(fileObject => fileObject.ToAssetDetails(assetsService))
                .ToList(),
            SubtitleSup = storedFile
                .FileObjects.Where(fileObject =>
                    fileObject.FileObjectVariant == FileObjectVariant.SubtitleSup
                )
                .Select(fileObject => fileObject.ToAssetDetails(assetsService))
                .ToList(),
        };
    }
}
