using Music.Core.Entities;
using Music.Core.Services.Images.Enums;
using Music.Core.Storage;
using PartyImageRead = Music.Core.Services.Parties.PartyImage;

namespace Music.Infrastructure.Mappers;

internal static class PartyReadMapper
{
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
