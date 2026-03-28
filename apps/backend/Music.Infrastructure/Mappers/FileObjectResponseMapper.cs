using Music.Core.Entities;
using Music.Core.Models;
using Music.Core.Services.Interfaces;

namespace Music.Infrastructure.Mappers;

internal static class FileObjectResponseMapper
{
    public static FileObjectDetailsModel ToContentDetailsModel(this FileObject fileObject, IContentService contentService)
    {
        return fileObject.ToDetailsModel(url: contentService.GetUrl(fileObject.Id));
    }

    public static FileObjectDetailsModel ToAssetDetailsModel(this FileObject fileObject, IAssetsService assetsService)
    {
        return fileObject.ToDetailsModel(url: assetsService.GetUrl(fileObject.StoragePath));
    }

    private static FileObjectDetailsModel ToDetailsModel(this FileObject fileObject, string url)
    {
        return new FileObjectDetailsModel
        {
            Id = fileObject.Id,
            Url = url,
            Type = fileObject.Type,
            FileObjectVariant = fileObject.FileObjectVariant,
            SizeInBytes = fileObject.SizeInBytes,
            MimeType = fileObject.MimeType,
            Container = fileObject.Container,
            Extension = fileObject.Extension,
            Codec = fileObject.Codec,
            Width = fileObject.Width,
            Height = fileObject.Height,
            AudioSampleRate = fileObject.AudioSampleRate,
            Bitrate = fileObject.Bitrate,
            FrameRate = fileObject.FrameRate,
            DurationInMs = fileObject.DurationInMs,
            OriginalFileName = fileObject.OriginalFileName,
            CreatedAt = fileObject.CreatedAt,
            UpdatedAt = fileObject.UpdatedAt,
        };
    }
}
