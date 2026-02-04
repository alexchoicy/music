using Music.Core.Enums;
using Music.Core.Models;

namespace Music.Core.Utils;


public static class MediaFoldersExtensions
{
    public static string GetFolder(this MediaFolderOptions variant, MediaFoldersOptions folders) =>
        variant switch
        {
            MediaFolderOptions.ORIGINALMUSIC => folders.OriginalMusic,
            MediaFolderOptions.ORIGINALVIDEO => folders.OriginalVideo,
            MediaFolderOptions.ORIGINALEXTRA => folders.OriginalExtra,
            MediaFolderOptions.DERIVATEDEDMUSIC => folders.DerivatedMusic,
            MediaFolderOptions.DERIVATEDEVIDEO => folders.DerivatedVideo,
            MediaFolderOptions.ASSETSCOVER => folders.AssetsCover,
            MediaFolderOptions.ASSETSPARTYCOVER => folders.AssetsParty + "/cover",
            MediaFolderOptions.ASSETSPARTYBANNER => folders.AssetsParty + "/banner",
            _ => throw new ArgumentOutOfRangeException(nameof(variant), variant, null)
        };
}
