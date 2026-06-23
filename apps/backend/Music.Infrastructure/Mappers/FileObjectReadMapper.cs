using Music.Core.Entities;
using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;
using Music.Core.Storage;

namespace Music.Infrastructure.Mappers;

internal static class FileObjectReadMapper
{
    public static ImageFileVariants ToImageVariants(
        this StoredFile? storedFile,
        IAssetsService assetsService
    )
    {
        if (storedFile?.FileObjects is null)
            return new ImageFileVariants();

        return new ImageFileVariants
        {
            Original = storedFile.GetAssetDetails(FileObjectVariant.Original, assetsService),
            ImageCover1024x1024 = storedFile.GetAssetDetails(
                FileObjectVariant.ImageCover1024x1024,
                assetsService
            ),
            ImageAvatar512x512 = storedFile.GetAssetDetails(
                FileObjectVariant.ImageAvatar512x512,
                assetsService
            ),
            ImageBanner1500x500 = storedFile.GetAssetDetails(
                FileObjectVariant.ImageBanner1500x500,
                assetsService
            ),
            ImageWide1280x720 = storedFile.GetAssetDetails(
                FileObjectVariant.ImageWide1280x720,
                assetsService
            ),
        };
    }

    private static FileObjectDetails? GetAssetDetails(
        this StoredFile storedFile,
        FileObjectVariant variant,
        IAssetsService assetsService
    )
    {
        return storedFile
            .FileObjects.Where(fileObject => fileObject.FileObjectVariant == variant)
            .Select(fileObject => fileObject.ToAssetDetails(assetsService))
            .FirstOrDefault();
    }

    public static FileObjectDetails ToContentDetails(
        this FileObject fileObject,
        IContentService contentService,
        bool isDash = false
    )
    {
        return fileObject.ToDetails(url: contentService.GetUrl(fileObject.Id), isDash: isDash);
    }

    public static FileObjectDetails ToAssetDetails(
        this FileObject fileObject,
        IAssetsService assetsService
    )
    {
        return fileObject.ToDetails(url: assetsService.GetUrl(fileObject.StoragePath));
    }

    private static FileObjectDetails ToDetails(
        this FileObject fileObject,
        string url,
        bool isDash = false
    )
    {
        return new FileObjectDetails
        {
            Id = fileObject.Id,
            Url = isDash ? $"{url}/manifest.mpd" : url,
            Variant = fileObject.FileObjectVariant,
            SizeInBytes = fileObject.SizeInBytes,
            MimeType = fileObject.MimeType,
            Container = fileObject.Container,
            Extension = fileObject.Extension,
            Codec = fileObject.Codec,
            Width = fileObject.Width,
            Height = fileObject.Height,
            AudioSampleRate = fileObject.AudioSampleRate,
            Bitrate = fileObject.Bitrate,
            BitsPerSample = fileObject.BitsPerSample,
            FrameRate = fileObject.FrameRate,
            DurationInMs = fileObject.DurationInMs,
            CreatedAt = fileObject.CreatedAt,
            UpdatedAt = fileObject.UpdatedAt,
        };
    }
}
