using Music.Core.Entities;
using Music.Core.Enums;
using Music.Core.Models;
using Music.Core.Services.Interfaces;

namespace Music.Infrastructure.Mappers;

internal static class ConcertResponseMappingExtensions
{
    public static IReadOnlyList<ConcertCoverVariantModel> ToConcertCoverVariants(this Concert concert, IAssetsService assetsService)
    {
        return concert.Cover?.File?.FileObjects
            .OrderBy(fileObject => fileObject.FileObjectVariant)
            .Select(fileObject => new ConcertCoverVariantModel
            {
                Variant = fileObject.FileObjectVariant,
                Url = assetsService.GetUrl(fileObject.StoragePath)
            })
            .ToList() ?? [];
    }

    public static IReadOnlyList<ConcertPartySummaryModel> ToConcertPartySummaryModels(this IEnumerable<ConcertParty> concertParties)
    {
        return concertParties
            .Where(concertParty => concertParty.Party is not null)
            .OrderBy(concertParty => concertParty.Role)
            .ThenBy(concertParty => concertParty.Party!.Name)
            .Select(concertParty => new ConcertPartySummaryModel
            {
                PartyId = concertParty.PartyId,
                Name = concertParty.Party!.Name,
                Type = concertParty.Party!.Type,
                Role = concertParty.Role,
            })
            .ToList();
    }

    public static ConcertFileVariantsModel ToConcertFileVariantsModel(
        this StoredFile? storedFile,
        IContentService contentService,
        IAssetsService assetsService)
    {
        if (storedFile?.FileObjects is null)
            throw new InvalidOperationException("Concert file is missing file objects");

        FileObject? original = storedFile.FileObjects
            .FirstOrDefault(fileObject => fileObject.FileObjectVariant == FileObjectVariant.Original);

        if (original is null)
            throw new InvalidOperationException("Concert file is missing Original file object variant");

        return new ConcertFileVariantsModel
        {
            Original = original.ToContentDetailsModel(contentService),
            DashAV1 = storedFile.FileObjects
                .Where(fileObject => fileObject.FileObjectVariant == FileObjectVariant.DashAV1)
                .Select(fileObject => fileObject.ToContentDetailsModel(contentService))
                .FirstOrDefault(),
            Thumbnail640x360 = storedFile.FileObjects
                .Where(fileObject => fileObject.FileObjectVariant == FileObjectVariant.Thumbnail640x360)
                .Select(fileObject => fileObject.ToAssetDetailsModel(assetsService))
                .FirstOrDefault(),
            AttachedPicture = storedFile.FileObjects
                .Where(fileObject => fileObject.FileObjectVariant == FileObjectVariant.AttachedPicture)
                .Select(fileObject => fileObject.ToAssetDetailsModel(assetsService))
                .FirstOrDefault(),
            SubtitleVtt = storedFile.FileObjects
                .Where(fileObject => fileObject.FileObjectVariant == FileObjectVariant.SubtitleVtt)
                .Select(fileObject => fileObject.ToAssetDetailsModel(assetsService))
                .ToList(),
            SubtitleSup = storedFile.FileObjects
                .Where(fileObject => fileObject.FileObjectVariant == FileObjectVariant.SubtitleSup)
                .Select(fileObject => fileObject.ToAssetDetailsModel(assetsService))
                .ToList(),
        };
    }
}
