using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Music.Core.Common.Exceptions;
using Music.Core.Entities;
using Music.Core.Options;
using Music.Core.Services.Extras;
using Music.Core.Services.Extras.Requests;
using Music.Core.Services.Extras.Results;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;
using Music.Core.Storage;
using Music.Infrastructure.Data;
using Music.Infrastructure.Mappers;

namespace Music.Infrastructure.Services.Extras;

public class ExtraService(
    AppDbContext dbContext,
    IContentService contentService,
    IAssetsService assetsService
) : IExtraService
{
    public async Task<IReadOnlyList<ExtraDetails>> GetByAlbumIdAsync(
        int albumId,
        CancellationToken cancellationToken = default
    )
    {
        List<Extra> extras = await QueryExtrasWithAssets()
            .AsNoTracking()
            .Where(extra => extra.ExtraAlbums.Any(link => link.AlbumId == albumId))
            .OrderBy(extra => extra.CreatedAt)
            .ToListAsync(cancellationToken);

        return extras.Select(extra => extra.ToDetails(contentService, assetsService)).ToList();
    }

    public async Task<SaveExtraResult> CreateForAlbumAsync(
        int albumId,
        SaveExtraRequest request,
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        bool albumExists = await dbContext.Albums.AnyAsync(
            album => album.Id == albumId,
            cancellationToken
        );
        if (!albumExists)
            throw new EntityNotFoundException($"Album {albumId} not found");

        await using IDbContextTransaction transaction =
            await dbContext.Database.BeginTransactionAsync(cancellationToken);

        Extra extra = new()
        {
            Title = request.Title.Trim(),
            CreatedByUserId = userId,
            ExtraAlbums = [new ExtraAlbum { AlbumId = albumId }],
        };
        dbContext.Extras.Add(extra);

        IReadOnlyList<ExtraAssetUploadResult> uploads = await SaveAsync(
            extra,
            request,
            userId,
            cancellationToken
        );

        await transaction.CommitAsync(cancellationToken);

        return new SaveExtraResult
        {
            Extra = await GetDetailsAsync(extra.Id, cancellationToken),
            Uploads = uploads,
        };
    }

    public async Task<SaveExtraResult> UpdateAsync(
        Guid extraId,
        SaveExtraRequest request,
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        if (request.Version is null)
            throw new ValidationException("Version is required when updating an extra.");

        Extra extra =
            await QueryExtrasWithAssets()
                .FirstOrDefaultAsync(extra => extra.Id == extraId, cancellationToken)
            ?? throw new EntityNotFoundException($"Extra {extraId} not found");

        dbContext.Entry(extra).Property(e => e.Version).OriginalValue = request.Version.Value;

        await using IDbContextTransaction transaction =
            await dbContext.Database.BeginTransactionAsync(cancellationToken);

        IReadOnlyList<ExtraAssetUploadResult> uploads = await SaveAsync(
            extra,
            request,
            userId,
            cancellationToken
        );

        await transaction.CommitAsync(cancellationToken);

        return new SaveExtraResult
        {
            Extra = await GetDetailsAsync(extra.Id, cancellationToken),
            Uploads = uploads,
        };
    }

    public async Task DeleteAsync(Guid extraId, CancellationToken cancellationToken = default)
    {
        int deleted = await dbContext
            .Extras.Where(extra => extra.Id == extraId)
            .ExecuteDeleteAsync(cancellationToken);

        if (deleted == 0)
            throw new EntityNotFoundException($"Extra {extraId} not found");
    }

    private IQueryable<Extra> QueryExtrasWithAssets() =>
        dbContext
            .Extras.AsSplitQuery()
            .Include(extra => extra.Assets)
                .ThenInclude(asset => asset.File)
                    .ThenInclude(file => file!.FileObjects);

    private async Task<ExtraDetails> GetDetailsAsync(
        Guid extraId,
        CancellationToken cancellationToken
    )
    {
        Extra extra = await QueryExtrasWithAssets()
            .AsNoTracking()
            .FirstAsync(extra => extra.Id == extraId, cancellationToken);

        return extra.ToDetails(contentService, assetsService);
    }

    // Applies the request onto the tracked extra and saves it.
    // Saved in two steps because Extra.CoverAssetId and ExtraAsset.ExtraId reference each other.
    private async Task<IReadOnlyList<ExtraAssetUploadResult>> SaveAsync(
        Extra extra,
        SaveExtraRequest request,
        string userId,
        CancellationToken cancellationToken
    )
    {
        extra.Title = request.Title.Trim();
        extra.Description = request.Description;
        extra.Category = request.Category;
        extra.Source = request.Source;
        extra.CoverAssetId = null;

        Dictionary<Guid, ExtraAsset> existingAssets = extra.Assets.ToDictionary(asset => asset.Id);

        Dictionary<string, StoredFile> knownFiles = await LoadKnownFilesAsync(
            request,
            cancellationToken
        );

        List<ExtraAsset> orderedAssets = [];
        List<ExtraAssetUploadResult> uploads = [];

        for (int index = 0; index < request.Assets.Count; index++)
        {
            SaveExtraAssetRequest assetRequest = request.Assets[index];
            string? title = string.IsNullOrWhiteSpace(assetRequest.Title)
                ? null
                : assetRequest.Title.Trim();

            if (assetRequest.AssetId is { } assetId)
            {
                if (!existingAssets.Remove(assetId, out ExtraAsset? existingAsset))
                    throw new ValidationException(
                        $"Asset {assetId} does not belong to this extra."
                    );

                existingAsset.Title = title;
                existingAsset.SortOrder = index;
                orderedAssets.Add(existingAsset);
                continue;
            }

            FileRequest fileRequest = assetRequest.File!;
            StoredFile storedFile;

            if (knownFiles.TryGetValue(fileRequest.Blake3Hash, out StoredFile? knownFile))
            {
                storedFile = knownFile;

                // Re-issue the upload if this user's earlier upload never finished
                FileObject? pendingOriginal = knownFile.FileObjects.FirstOrDefault(fileObject =>
                    fileObject.FileObjectVariant == FileObjectVariant.Original
                    && fileObject.ProcessingStatus == FileProcessingStatus.Pending
                );
                if (pendingOriginal is not null && knownFile.UploadedByUserId == userId)
                    uploads.Add(
                        await CreateUploadAsync(pendingOriginal, knownFile.Type, cancellationToken)
                    );
            }
            else
            {
                (storedFile, FileObject fileObject) = CreateStoredFile(fileRequest, userId);
                knownFiles[fileRequest.Blake3Hash] = storedFile;
                uploads.Add(
                    await CreateUploadAsync(fileObject, storedFile.Type, cancellationToken)
                );
            }

            ExtraAsset asset = new()
            {
                Extra = extra,
                File = storedFile,
                Title = title,
                SortOrder = index,
            };
            extra.Assets.Add(asset);
            orderedAssets.Add(asset);
        }

        foreach (ExtraAsset removedAsset in existingAssets.Values)
        {
            extra.Assets.Remove(removedAsset);
            dbContext.ExtraAssets.Remove(removedAsset);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        ExtraAsset? coverAsset = request.CoverAssetIndex is { } coverIndex
            ? orderedAssets[coverIndex]
            : null;

        if (coverAsset is not null && coverAsset.File!.Type != FileType.Image)
            throw new ValidationException("Cover asset must be an image.");

        extra.CoverAssetId = coverAsset?.Id;
        extra.CoverCropX = coverAsset is null ? null : request.CoverCroppedArea?.X;
        extra.CoverCropY = coverAsset is null ? null : request.CoverCroppedArea?.Y;
        extra.CoverCropWidth = coverAsset is null ? null : request.CoverCroppedArea?.Width;
        extra.CoverCropHeight = coverAsset is null ? null : request.CoverCroppedArea?.Height;

        await dbContext.SaveChangesAsync(cancellationToken);

        return uploads;
    }

    private async Task<Dictionary<string, StoredFile>> LoadKnownFilesAsync(
        SaveExtraRequest request,
        CancellationToken cancellationToken
    )
    {
        List<string> hashes = request
            .Assets.Where(asset => asset.File is not null)
            .Select(asset => asset.File!.Blake3Hash)
            .ToList();

        if (hashes.Count == 0)
            return [];

        return await dbContext
            .StoredFiles.Include(file => file.FileObjects)
            .Where(file => hashes.Contains(file.OriginalBlake3Hash))
            .ToDictionaryAsync(file => file.OriginalBlake3Hash, cancellationToken);
    }

    private (StoredFile storedFile, FileObject fileObject) CreateStoredFile(
        FileRequest fileRequest,
        string userId
    )
    {
        FileType fileType = GetFileType(fileRequest.MimeType);

        (StoredFile storedFile, FileObject fileObject) = fileType switch
        {
            FileType.Image => assetsService.CreateStoredFileWithObject(
                fileRequest,
                fileType,
                assetsService.GetStoragePath(
                    MediaFolderOptions.AssetsExtra,
                    fileRequest.Blake3Hash,
                    fileRequest.MimeType,
                    fileRequest.OriginalFileName
                ),
                StorageArea.Assets,
                FileObjectVariant.Original,
                userId
            ),
            _ => contentService.CreateStoredFileWithObject(
                fileRequest,
                fileType,
                contentService.GetStoragePath(
                    MediaFolderOptions.OriginalExtra,
                    fileRequest.Blake3Hash,
                    fileRequest.MimeType,
                    fileRequest.OriginalFileName
                ),
                StorageArea.Content,
                FileObjectVariant.Original,
                userId
            ),
        };

        dbContext.StoredFiles.Add(storedFile);
        dbContext.FileObjects.Add(fileObject);

        return (storedFile, fileObject);
    }

    private async Task<ExtraAssetUploadResult> CreateUploadAsync(
        FileObject fileObject,
        FileType fileType,
        CancellationToken cancellationToken
    )
    {
        if (fileType == FileType.Image)
            return new ExtraAssetUploadResult
            {
                Blake3Hash = fileObject.ObjectBlake3Hash,
                FileObjectId = fileObject.Id,
                UploadUrl = assetsService.CreateUploadUrlAsync(
                    fileObject.StoragePath,
                    fileObject.MimeType,
                    cancellationToken
                ),
            };

        return new ExtraAssetUploadResult
        {
            Blake3Hash = fileObject.ObjectBlake3Hash,
            FileObjectId = fileObject.Id,
            MultipartUploadInfo = await contentService.CreateMultipartUploadAsync(
                fileObject.StoragePath,
                fileObject.MimeType,
                fileObject.SizeInBytes,
                cancellationToken
            ),
        };
    }

    private static FileType GetFileType(string mimeType) =>
        mimeType.ToLowerInvariant() switch
        {
            var mime when mime.StartsWith("image/") => FileType.Image,
            var mime when mime.StartsWith("audio/") => FileType.Audio,
            var mime when mime.StartsWith("video/") => FileType.Video,
            _ => FileType.Document,
        };
}
