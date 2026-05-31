using Music.Core.Configuration.Options;

namespace Music.Core.Shared.Utils;

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
            MediaFolderOptions.AssetsVideoSubtitle => folders.AssetsVideoSubtitle,
            MediaFolderOptions.AssetsVideoArtwork => folders.AssetsVideoArtwork,
            _ => throw new ArgumentOutOfRangeException(nameof(variant), variant, null),
        };
}
