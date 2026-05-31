using Music.Core.Application.Storage;
using Music.Core.Domain.Images.Enums;
using Music.Core.Entities;
using PartyImageRead = Music.Core.Domain.Parties.PartyImage;

namespace Music.Infrastructure.Mappers;

internal static class PartyReadMapper
{
    public static IReadOnlyList<PartyImageRead> ToPartyImages(
        this IEnumerable<FileObject>? fileObjects,
        IAssetsService assetsService
    )
    {
        return fileObjects
                ?.OrderBy(fileObject => fileObject.FileObjectVariant)
                .Select(fileObject => new PartyImageRead
                {
                    Url = assetsService.GetUrl(fileObject.StoragePath),
                    Variant = fileObject.FileObjectVariant,
                })
                .ToList()
            ?? [];
    }

    public static IReadOnlyList<PartyImageRead> ToPrimaryAvatarImages(
        this Party party,
        IAssetsService assetsService
    )
    {
        return party
            .Images.Where(image => image.ImageRole == ImageRole.Avatar && image.IsPrimary)
            .SelectMany(image => image.File?.FileObjects ?? [])
            .OrderBy(fileObject => fileObject.FileObjectVariant)
            .Select(fileObject => new PartyImageRead
            {
                Url = assetsService.GetUrl(fileObject.StoragePath),
                Variant = fileObject.FileObjectVariant,
            })
            .ToList();
    }
}
