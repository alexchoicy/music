using Music.Core.Entities;
using Music.Core.Services.Files;
using Music.Core.Services.Images.Enums;
using Music.Core.Storage;

namespace Music.Infrastructure.Mappers;

internal static class PartyReadMapper
{
    public static ImageFileVariants ToPrimaryAvatarImages(
        this Party party,
        IAssetsService assetsService
    )
    {
        return party
            .Images.Where(image => image.ImageRole == ImageRole.Avatar && image.IsPrimary)
            .OrderBy(image => image.CreatedAt)
            .FirstOrDefault()
            ?.File.ToImageVariants(assetsService) ?? new ImageFileVariants();
    }
}
