using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Music.Core.Common.Exceptions;
using Music.Core.Common.Utils;
using Music.Core.Entities;
using Music.Core.Options;
using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;
using Music.Core.Services.Images.Enums;
using Music.Core.Storage;
using Music.Core.Workers;
using Music.Infrastructure.Data;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace Music.Infrastructure.Workers.Processor;

class ImageUploadWorkerProcessor(
    AppDbContext dbContext,
    IAssetsService assetsService,
    IHashService hashService,
    IOptions<StorageOptions> storageOptions,
    ILogger<ImageUploadWorkerProcessor> logger
)
{
    private const int JpegQuality = 90;
    private const string GeneratedImageMimeType = "image/jpeg";
    private const string GeneratedImageExtension = "jpg";

    public async Task ProcessAsync(
        ImageUploadProcessWorker job,
        CancellationToken cancellationToken
    )
    {
        string? sourcePath = null;
        string? outputPath = null;

        string tempDir = storageOptions.Value.TempDir;
        Directory.CreateDirectory(tempDir);

        FileObject sourceFileObject =
            await dbContext.FileObjects.FirstOrDefaultAsync(
                fileObject => fileObject.Id == job.FileObjectId,
                cancellationToken
            )
            ?? throw new EntityNotFoundException(
                $"File object with ID {job.FileObjectId} not found."
            );

        // if (sourceFileObject.ProcessingStatus == FileProcessingStatus.Completed)
        //     throw new InvalidOperationException("Cannot process a completed file object.");

        sourceFileObject.ProcessingStatus = FileProcessingStatus.Processing;
        await dbContext.SaveChangesAsync(cancellationToken);

        try
        {
            sourcePath = Path.Combine(
                tempDir,
                $"image_{sourceFileObject.Id}.{sourceFileObject.Extension}"
            );

            await assetsService.DownloadFileToTempAsync(
                sourceFileObject.StoragePath,
                sourcePath,
                cancellationToken
            );

            using Image<Rgba32> image = await Image.LoadAsync<Rgba32>(
                sourcePath,
                cancellationToken
            );
            image.Mutate(operation => operation.AutoOrient());

            ImageVariantPlan variantPlan = await GetImageVariantPlanAsync(
                sourceFileObject.FileId,
                cancellationToken
            );

            FileCroppedAreaRequest croppedArea = variantPlan.ToCroppedArea(
                image.Width,
                image.Height
            );
            bool isExplicitCrop =
                croppedArea.Width != image.Width || croppedArea.Height != image.Height;

            if (
                !isExplicitCrop
                && image.Width <= variantPlan.TargetWidth
                && image.Height <= variantPlan.TargetHeight
            )
            {
                logger.LogInformation(
                    "Skipping image variant {Variant} for file object {FileObjectId}: source {Width}x{Height} fits within target {TargetWidth}x{TargetHeight}",
                    variantPlan.Variant,
                    sourceFileObject.Id,
                    image.Width,
                    image.Height,
                    variantPlan.TargetWidth,
                    variantPlan.TargetHeight
                );
                sourceFileObject.ProcessingStatus = FileProcessingStatus.Completed;
                await dbContext.SaveChangesAsync(cancellationToken);
                return;
            }

            Rectangle cropRectangle = isExplicitCrop
                ? BuildCropRectangle(
                    image.Width,
                    image.Height,
                    croppedArea,
                    variantPlan.TargetWidth,
                    variantPlan.TargetHeight
                )
                : new Rectangle(0, 0, image.Width, image.Height);

            Size outputSize = FitWithin(
                cropRectangle.Width,
                cropRectangle.Height,
                variantPlan.TargetWidth,
                variantPlan.TargetHeight
            );

            logger.LogInformation(
                "Processing image variant {Variant} for file object {FileObjectId}: source {SourceWidth}x{SourceHeight}, crop {CropX},{CropY} {CropWidth}x{CropHeight}, output {OutputWidth}x{OutputHeight}",
                variantPlan.Variant,
                sourceFileObject.Id,
                image.Width,
                image.Height,
                cropRectangle.X,
                cropRectangle.Y,
                cropRectangle.Width,
                cropRectangle.Height,
                outputSize.Width,
                outputSize.Height
            );

            outputPath = Path.Combine(
                tempDir,
                $"image_{sourceFileObject.Id}_{variantPlan.Variant}.{GeneratedImageExtension}"
            );

            using Image<Rgba32> variantImage = image.Clone(operation =>
            {
                operation.Crop(cropRectangle);

                if (
                    outputSize.Width != cropRectangle.Width
                    || outputSize.Height != cropRectangle.Height
                )
                {
                    operation.Resize(
                        new ResizeOptions
                        {
                            Size = outputSize,
                            Mode = ResizeMode.Stretch,
                            Sampler = KnownResamplers.Lanczos3,
                        }
                    );
                }
            });

            StripMetadata(variantImage);
            await variantImage.SaveAsJpegAsync(outputPath, CreateJpegEncoder(), cancellationToken);

            await PersistGeneratedVariantAsync(
                sourceFileObject,
                variantPlan,
                outputPath,
                outputSize,
                cancellationToken
            );

            sourceFileObject.ProcessingStatus = FileProcessingStatus.Completed;
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        finally
        {
            WorkerFileOperations.TryDeleteTempFile(sourcePath, logger);
            WorkerFileOperations.TryDeleteTempFile(outputPath, logger);
        }
    }

    private async Task PersistGeneratedVariantAsync(
        FileObject sourceFileObject,
        ImageVariantPlan variantPlan,
        string outputPath,
        Size outputSize,
        CancellationToken cancellationToken
    )
    {
        FileObject? fileObject = await dbContext.FileObjects.FirstOrDefaultAsync(
            fileObject =>
                fileObject.FileId == sourceFileObject.FileId
                && fileObject.FileObjectVariant == variantPlan.Variant,
            cancellationToken
        );

        string hash = await hashService.ComputeBlake3HashAsync(outputPath, cancellationToken);
        string storagePath = assetsService.GetStoragePath(
            MediaFolderOptions.AssetsCropped,
            hash,
            GeneratedImageMimeType
        );

        await assetsService.UploadFileFromTempAsync(
            storagePath,
            outputPath,
            GeneratedImageMimeType,
            cancellationToken
        );

        if (fileObject is null)
        {
            fileObject = new FileObject
            {
                FileId = sourceFileObject.FileId,
                FileObjectVariant = variantPlan.Variant,
                StorageArea = StorageArea.Assets,
                StoragePath = storagePath,
                ObjectBlake3Hash = hash,
                SizeInBytes = new FileInfo(outputPath).Length,
                MimeType = GeneratedImageMimeType,
                Container = GeneratedImageExtension,
                Extension = GeneratedImageExtension,
                Width = outputSize.Width,
                Height = outputSize.Height,
                Lossless = false,
                ProcessingStatus = FileProcessingStatus.Completed,
            };

            dbContext.FileObjects.Add(fileObject);
        }
        else
        {
            fileObject.StoragePath = storagePath;
            fileObject.ObjectBlake3Hash = hash;
            fileObject.SizeInBytes = new FileInfo(outputPath).Length;
            fileObject.MimeType = GeneratedImageMimeType;
            fileObject.Container = GeneratedImageExtension;
            fileObject.Extension = GeneratedImageExtension;
            fileObject.Width = outputSize.Width;
            fileObject.Height = outputSize.Height;
            fileObject.ProcessingStatus = FileProcessingStatus.Completed;
            fileObject.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static JpegEncoder CreateJpegEncoder()
    {
        return new JpegEncoder { Quality = JpegQuality };
    }

    private static void StripMetadata(Image image)
    {
        image.Metadata.ExifProfile = null;
        image.Metadata.IccProfile = null;
        image.Metadata.IptcProfile = null;
        image.Metadata.XmpProfile = null;
    }

    private async Task<ImageVariantPlan> GetImageVariantPlanAsync(
        int fileId,
        CancellationToken cancellationToken
    )
    {
        AlbumImage? albumImage = await dbContext.AlbumImages.FirstOrDefaultAsync(
            image => image.FileId == fileId,
            cancellationToken
        );
        if (albumImage is not null)
            return ImageVariantPlan.From(
                albumImage,
                FileObjectVariant.ImageCover1024x1024,
                1024,
                1024
            );

        PartyImage? partyImage = await dbContext.PartyImages.FirstOrDefaultAsync(
            image => image.FileId == fileId,
            cancellationToken
        );
        if (partyImage is not null)
        {
            (FileObjectVariant variant, int width, int height) = partyImage.ImageRole switch
            {
                ImageRole.Avatar => (FileObjectVariant.ImageAvatar512x512, 512, 512),
                ImageRole.Banner => (FileObjectVariant.ImageBanner1500x500, 1500, 500),
                _ => (FileObjectVariant.ImageCover1024x1024, 1024, 1024),
            };

            return ImageVariantPlan.From(partyImage, variant, width, height);
        }

        ConcertImage? concertImage = await dbContext.ConcertImages.FirstOrDefaultAsync(
            image => image.FileId == fileId,
            cancellationToken
        );
        if (concertImage is not null)
            return ImageVariantPlan.From(
                concertImage,
                FileObjectVariant.ImageWide1280x720,
                1280,
                720
            );

        throw new EntityNotFoundException($"Image owner for file ID {fileId} not found.");
    }

    private static Rectangle BuildCropRectangle(
        int imageWidth,
        int imageHeight,
        FileCroppedAreaRequest croppedArea,
        int targetWidth,
        int targetHeight
    )
    {
        int x = Math.Clamp(croppedArea.X, 0, imageWidth - 1);
        int y = Math.Clamp(croppedArea.Y, 0, imageHeight - 1);

        Rectangle source = new(
            x,
            y,
            Math.Clamp(croppedArea.Width, 1, imageWidth - x),
            Math.Clamp(croppedArea.Height, 1, imageHeight - y)
        );

        double targetAspectRatio = targetWidth / (double)targetHeight;

        return CenterCropToAspectRatio(source, targetAspectRatio);
    }

    private static Size FitWithin(int width, int height, int maxWidth, int maxHeight)
    {
        double scale = Math.Min(maxWidth / (double)width, maxHeight / (double)height);
        if (scale >= 1)
            return new Size(width, height);

        return new Size(
            Math.Max(1, (int)Math.Round(width * scale)),
            Math.Max(1, (int)Math.Round(height * scale))
        );
    }

    private sealed record ImageVariantPlan(
        FileObjectVariant Variant,
        int TargetWidth,
        int TargetHeight,
        int? CropX,
        int? CropY,
        int? CropWidth,
        int? CropHeight
    )
    {
        public static ImageVariantPlan From(
            AlbumImage image,
            FileObjectVariant variant,
            int targetWidth,
            int targetHeight
        ) =>
            new(
                variant,
                targetWidth,
                targetHeight,
                image.CropX,
                image.CropY,
                image.CropWidth,
                image.CropHeight
            );

        public static ImageVariantPlan From(
            PartyImage image,
            FileObjectVariant variant,
            int targetWidth,
            int targetHeight
        ) =>
            new(
                variant,
                targetWidth,
                targetHeight,
                image.CropX,
                image.CropY,
                image.CropWidth,
                image.CropHeight
            );

        public static ImageVariantPlan From(
            ConcertImage image,
            FileObjectVariant variant,
            int targetWidth,
            int targetHeight
        ) =>
            new(
                variant,
                targetWidth,
                targetHeight,
                image.CropX,
                image.CropY,
                image.CropWidth,
                image.CropHeight
            );

        public FileCroppedAreaRequest ToCroppedArea(int imageWidth, int imageHeight) =>
            new()
            {
                X = CropX ?? 0,
                Y = CropY ?? 0,
                Width = CropWidth ?? imageWidth,
                Height = CropHeight ?? imageHeight,
            };
    }

    private static Rectangle CenterCropToAspectRatio(Rectangle source, double targetAspectRatio)
    {
        double sourceAspectRatio = source.Width / (double)source.Height;

        if (Math.Abs(sourceAspectRatio - targetAspectRatio) < 0.0001)
        {
            return source;
        }

        if (sourceAspectRatio > targetAspectRatio)
        {
            int width = Math.Clamp(
                (int)Math.Floor(source.Height * targetAspectRatio),
                1,
                source.Width
            );
            int x = source.X + (source.Width - width) / 2;

            return new Rectangle(x, source.Y, width, source.Height);
        }

        int height = Math.Clamp(
            (int)Math.Floor(source.Width / targetAspectRatio),
            1,
            source.Height
        );
        int y = source.Y + (source.Height - height) / 2;

        return new Rectangle(source.X, y, source.Width, height);
    }
}
