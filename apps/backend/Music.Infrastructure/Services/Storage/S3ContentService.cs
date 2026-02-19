using Microsoft.Extensions.Options;
using Music.Core.Models;
using Amazon.S3;
using Amazon.S3.Model;
using System.ComponentModel.DataAnnotations;
using Music.Infrastructure.Data;
using Music.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Music.Core.Exceptions;
using Music.Core.Services.Interfaces;

namespace Music.Infrastructure.Services.Storage;

public class S3ContentService(
    IOptions<StorageOptions> options,
    Content3Client client,
    AppDbContext context,
    IOptions<BaseOptions> baseOptions,
    IBackgroundTaskQueue backgroundTaskQueue) : StorageService(options, backgroundTaskQueue), IContentService
{
    private readonly string bucket = options.Value.Content!.S3!.BucketName;

    public async Task CompleteAudioMultipartUploadAsync(
        List<Core.Models.CompleteMultipartUploadRequest> requests,
        string userId,
        CancellationToken cancellationToken = default)
    {
        foreach (Core.Models.CompleteMultipartUploadRequest request in requests)
        {
            if (request.Parts.Count == 0)
                throw new ValidationException($"Multipart upload for {request.Blake3Id} has no parts.");

            FileObject fileObject = await context.FileObjects
                .Include(fileobject => fileobject.File)
                .ThenInclude(f => f!.TrackSources)
                .FirstOrDefaultAsync(
                    fileobject => fileobject.OriginalBlake3Hash == request.Blake3Id
                        && fileobject.CreatedByUserId == userId
                        && fileobject.ProcessingStatus == Core.Enums.FileProcessingStatus.Pending,
                    cancellationToken)
                ?? throw new EntityNotFoundException(
                    $"No pending upload found for file hash {request.Blake3Id}.");

            List<PartETag> partETags =
                    request.Parts.Select(p => new PartETag
                    {
                        PartNumber = p.PartNumber,
                        ETag = p.ETag
                    }).ToList();

            Amazon.S3.Model.CompleteMultipartUploadRequest completeRequest = new()
            {
                BucketName = bucket,
                Key = fileObject.StoragePath,
                UploadId = request.UploadId,
                PartETags = partETags
            };

            await client.CompleteMultipartUploadAsync(completeRequest, cancellationToken);
            fileObject.ProcessingStatus = Core.Enums.FileProcessingStatus.Completed;

            TrackSource? primarySource = fileObject.File?.TrackSources
                .OrderByDescending(ts => ts.Pinned)
                .ThenBy(ts => ts.Rank)
                .FirstOrDefault();

            if (primarySource is not null)
            {
                TrackUploadProcessWorkerModel workerModel = new()
                {
                    FileObjectId = fileObject.Id,
                    TrackSourceId = primarySource.Id,
                };

                //TODO: generate Peak for waveform and a opus
                RunBackgroundProcessAudioUploadFile(workerModel);
            }
        }

        await context.SaveChangesAsync(cancellationToken);
        return;
    }

    public async Task<MultipartUploadInfo> CreateMultipartUploadAsync(string objectPath, string mimeType, long fileSizeInBytes, CancellationToken cancellationToken = default)
    {
        InitiateMultipartUploadRequest initiateRequest = new()
        {
            BucketName = bucket,
            Key = objectPath,
            ContentType = mimeType
        };

        InitiateMultipartUploadResponse initiateResponse = await client
            .InitiateMultipartUploadAsync(initiateRequest, cancellationToken);

        const long partSizeInBytes = 10L * 1024 * 1024;
        int partCount = (int)Math.Ceiling((double)fileSizeInBytes / partSizeInBytes);

        List<MultipartUploadPartInfo> parts = new(partCount);

        for (int partNumber = 1; partNumber <= partCount; partNumber++)
        {
            GetPreSignedUrlRequest presignRequest = new()
            {
                BucketName = bucket,
                Key = objectPath,
                Verb = HttpVerb.PUT,
                UploadId = initiateResponse.UploadId,
                PartNumber = partNumber,
                Expires = DateTime.UtcNow.AddMinutes(30) // I dunno
            };

            string url = client.GetPreSignedURL(presignRequest);

            parts.Add(new MultipartUploadPartInfo
            {
                PartNumber = partNumber,
                Url = url
            });
        }

        return new MultipartUploadInfo
        {
            UploadId = initiateResponse.UploadId,
            PartSizeInBytes = partSizeInBytes,
            Parts = parts
        };
    }

    public string GetPlayPresignedUrlAsync(string objectPath, CancellationToken cancellationToken = default)
    {
        GetPreSignedUrlRequest presignRequest = new()
        {
            BucketName = bucket,
            Key = objectPath,
            Verb = HttpVerb.GET,
            Expires = DateTime.UtcNow.AddMinutes(30)
        };

        string url = client.GetPreSignedURL(presignRequest);
        return url;
    }

    public string GetUrl(Guid id)
    {
        return $"{baseOptions.Value.ApiUrl}/files/{id}";
    }
}

public sealed class Content3Client(string ak, string sk, AmazonS3Config cfg) : AmazonS3Client(ak, sk, cfg)
{
}
