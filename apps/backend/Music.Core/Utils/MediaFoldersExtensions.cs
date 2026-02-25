using Music.Core.Enums;
using Music.Core.Models;

namespace Music.Core.Utils;


public static class MediaFoldersExtensions
{
    public static string GetFolder(this MediaFolderOptions variant, MediaFoldersOptions folders) =>
        variant switch
        {
            MediaFolderOptions.OriginalMusic => folders.OriginalMusic,
            MediaFolderOptions.OriginalVideo => folders.OriginalVideo,
            MediaFolderOptions.OriginalExtra => folders.OriginalExtra,
            MediaFolderOptions.DerivedMusic => folders.DerivedMusic,
            MediaFolderOptions.DerivedVideo => folders.DerivedVideo,
            MediaFolderOptions.AssetsCover => folders.AssetsCover,
            MediaFolderOptions.PartyCover => folders.AssetsParty + "/cover",
            MediaFolderOptions.PartyBanner => folders.AssetsParty + "/banner",
            MediaFolderOptions.AssetsPeak => folders.AssetsPeak,
            _ => throw new ArgumentOutOfRangeException(nameof(variant), variant, null)
        };
}
