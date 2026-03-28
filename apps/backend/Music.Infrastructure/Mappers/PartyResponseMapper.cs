using Music.Core.Entities;
using Music.Core.Models;
using Music.Core.Services.Interfaces;

namespace Music.Infrastructure.Mappers;

internal static class PartyResponseMapper
{
    public static IReadOnlyList<PartyImageModel> ToPartyImageModels(this IEnumerable<FileObject>? fileObjects, IAssetsService assetsService)
    {
        return fileObjects?
            .OrderBy(fileObject => fileObject.FileObjectVariant)
            .Select(fileObject => new PartyImageModel
            {
                Url = assetsService.GetUrl(fileObject.StoragePath),
                Variant = fileObject.FileObjectVariant
            })
            .ToList() ?? [];
    }

    public static IReadOnlyList<PartyImageModel> ToPrimaryAvatarImageModels(this Party party, IAssetsService assetsService)
    {
        return party.Images
            .Where(image => image.PartyImageType == Core.Enums.PartyImageType.Avatar && image.IsPrimary)
            .SelectMany(image => image.File?.FileObjects ?? [])
            .OrderBy(fileObject => fileObject.FileObjectVariant)
            .Select(fileObject => new PartyImageModel
            {
                Url = assetsService.GetUrl(fileObject.StoragePath),
                Variant = fileObject.FileObjectVariant
            })
            .ToList();
    }
}
