using Music.Core.Entities;
using Music.Core.Services.Extras.Results;
using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;
using Music.Core.Storage;

namespace Music.Infrastructure.Mappers;

internal static class ExtraReadMapper
{
    public static ExtraDetails ToDetails(
        this Extra extra,
        IContentService contentService,
        IAssetsService assetsService
    )
    {
        return new ExtraDetails
        {
            ExtraId = extra.Id,
            Title = extra.Title,
            Description = extra.Description,
            Category = extra.Category,
            Source = extra.Source,
            CoverAssetId = extra.CoverAssetId,
            CoverCroppedArea = extra.ToCoverCroppedArea(),
            Version = extra.Version,
            CreatedAt = extra.CreatedAt,
            UpdatedAt = extra.UpdatedAt,
            Assets = extra
                .Assets.OrderBy(asset => asset.SortOrder)
                .Select(asset => asset.ToDetails(contentService, assetsService))
                .ToList(),
        };
    }

    private static FileCroppedAreaRequest? ToCoverCroppedArea(this Extra extra)
    {
        if (
            extra.CoverCropX is not { } x
            || extra.CoverCropY is not { } y
            || extra.CoverCropWidth is not { } width
            || extra.CoverCropHeight is not { } height
        )
            return null;

        return new FileCroppedAreaRequest
        {
            X = x,
            Y = y,
            Width = width,
            Height = height,
        };
    }

    private static ExtraAssetDetails ToDetails(
        this ExtraAsset asset,
        IContentService contentService,
        IAssetsService assetsService
    )
    {
        StoredFile file = asset.File!;
        FileObject? original = file.GetObject(FileObjectVariant.Original);
        bool isAsset = original?.StorageArea == StorageArea.Assets;

        return new ExtraAssetDetails
        {
            AssetId = asset.Id,
            Title = asset.Title,
            SortOrder = asset.SortOrder,
            FileType = file.Type,
            OriginalFileName = file.OriginalFileName,
            ProcessingStatus = original?.ProcessingStatus ?? FileProcessingStatus.Pending,
            Original =
                original is null ? null
                : isAsset ? original.ToAssetDetails(assetsService)
                : original.ToContentDetails(contentService),
            Preview = file.GetObject(FileObjectVariant.ImagePreview2048)
                ?.ToAssetDetails(assetsService),
            Thumbnail = file.GetObject(FileObjectVariant.ImageThumbnail512)
                ?.ToAssetDetails(assetsService),
        };
    }

    private static FileObject? GetObject(this StoredFile file, FileObjectVariant variant) =>
        file.FileObjects.FirstOrDefault(fileObject => fileObject.FileObjectVariant == variant);
}
