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
using Amazon.S3.Transfer;

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

    public string GetDownloadPresignedUrl(string objectPath, string fileName, CancellationToken cancellationToken = default)
    {
        GetPreSignedUrlRequest presignRequest = new()
        {
            BucketName = bucket,
            Key = objectPath,
            Verb = HttpVerb.GET,
            Expires = DateTime.UtcNow.AddMinutes(30),
            ResponseHeaderOverrides = new ResponseHeaderOverrides
            {
                ContentDisposition = $"attachment; filename=\"{fileName.Replace("\"", "")}\""
            }
        };

        string url = client.GetPreSignedURL(presignRequest);
        return url;
    }

    public string GetUrl(Guid id)
    {
        return $"{baseOptions.Value.ApiUrl}/files/{id}";
    }

    public async Task DownloadFileToTemp(string objectPath, string destinationPath, CancellationToken cancellationToken = default)
    {
        TransferUtility transferUtility = new(client);

        await transferUtility.DownloadAsync(destinationPath, bucket, objectPath, cancellationToken);
    }

    public async Task UploadFileFromTempAsync(string objectPath, string sourcePath, CancellationToken cancellationToken = default)
    {
        const long multipartThreshold = 64L * 1024 * 1024;
        const long partSize = 10L * 1024 * 1024;

        FileInfo fileInfo = new(sourcePath);
        if (!fileInfo.Exists)
            throw new FileNotFoundException("Temp file not found.", sourcePath);

        string mimeType = fileInfo.Extension.TrimStart('.').ToLowerInvariant() switch
        {
            "opus" => "audio/opus",
            "json" => "application/json",
            "mp4" => "video/mp4",
            _ => "application/octet-stream"
        };

        if (fileInfo.Length < multipartThreshold)
        {
            PutObjectRequest put = new()
            {
                BucketName = bucket,
                Key = objectPath,
                ContentType = mimeType,
                FilePath = sourcePath,
                UseChunkEncoding = false,
                DisablePayloadSigning = true,
            };
            await client.PutObjectAsync(put, cancellationToken);
            return;
        }
        InitiateMultipartUploadResponse init = await client.InitiateMultipartUploadAsync(
            new InitiateMultipartUploadRequest
            {
                BucketName = bucket,
                Key = objectPath,
                ContentType = mimeType
            },
            cancellationToken);

        List<PartETag> etags = [];

        try
        {
            long position = 0;
            int partNumber = 1;
            while (position < fileInfo.Length)
            {
                long currentPartSize = Math.Min(partSize, fileInfo.Length - position);
                UploadPartRequest part = new()
                {
                    BucketName = bucket,
                    Key = objectPath,
                    UploadId = init.UploadId,
                    PartNumber = partNumber,
                    FilePath = sourcePath,
                    FilePosition = position,
                    PartSize = currentPartSize,
                    UseChunkEncoding = false,
                    DisablePayloadSigning = true,
                    IsLastPart = position + currentPartSize >= fileInfo.Length
                };
                UploadPartResponse uploaded = await client.UploadPartAsync(part, cancellationToken);
                etags.Add(new PartETag(partNumber, uploaded.ETag));
                position += currentPartSize;
                partNumber++;
            }

            await client.CompleteMultipartUploadAsync(new Amazon.S3.Model.CompleteMultipartUploadRequest
            {
                BucketName = bucket,
                Key = objectPath,
                UploadId = init.UploadId,
                PartETags = etags
            }, cancellationToken);
        }
        catch
        {
            await client.AbortMultipartUploadAsync(new AbortMultipartUploadRequest
            {
                BucketName = bucket,
                Key = objectPath,
                UploadId = init.UploadId
            }, cancellationToken);
            throw;
        }
    }
}

public sealed class Content3Client(string ak, string sk, AmazonS3Config cfg) : AmazonS3Client(ak, sk, cfg)
{
}
