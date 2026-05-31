using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Transfer;
using Microsoft.Extensions.Options;
using Music.Core.Storage;
using Music.Core.Workers;
using Music.Core.Options;
using Music.Core.Services.Uploads;
using Music.Core.Services.Uploads.Requests;
using Music.Core.Services.Uploads.Results;
using Music.Core.Common.Utils;
using S3CompleteMultipartUploadRequest = Amazon.S3.Model.CompleteMultipartUploadRequest;
using UploadCompleteMultipartUploadPart = Music.Core.Services.Uploads.Requests.CompleteMultipartUploadPart;

namespace Music.Infrastructure.Storages.S3;

public class S3ContentService(
    IOptions<StorageOptions> options,
    ContentS3Client client,
    IOptions<BaseOptions> baseOptions,
    IBackgroundTaskQueue backgroundTaskQueue
) : StorageService(options, backgroundTaskQueue), IContentService
{
    private readonly string bucket = options.Value.Content!.S3!.BucketName;

    public async Task<MultipartUploadResults> CreateMultipartUploadAsync(
        string objectPath,
        string mimeType,
        long fileSizeInBytes,
        CancellationToken cancellationToken = default
    )
    {
        const long partSizeInBytes = 10L * 1024 * 1024;
        int partCount = (int)Math.Ceiling((double)fileSizeInBytes / partSizeInBytes);

        if (partCount <= 0)
            throw new ArgumentOutOfRangeException(
                nameof(fileSizeInBytes),
                "Multipart uploads require a positive file size."
            );

        if (partCount > 10_000)
            throw new ArgumentOutOfRangeException(
                nameof(fileSizeInBytes),
                "Multipart upload exceeds the S3 limit of 10,000 parts."
            );

        InitiateMultipartUploadRequest initiateRequest = new()
        {
            BucketName = bucket,
            Key = objectPath,
            ContentType = mimeType,
        };

        InitiateMultipartUploadResponse initiateResponse =
            await client.InitiateMultipartUploadAsync(initiateRequest, cancellationToken);

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
                Expires = DateTime.UtcNow.AddHours(10), // I dunno In case HAHA
            };

            string url = client.GetPreSignedURL(presignRequest);

            parts.Add(new MultipartUploadPartInfo { PartNumber = partNumber, Url = url });
        }

        return new MultipartUploadResults
        {
            UploadId = initiateResponse.UploadId,
            PartSizeInBytes = partSizeInBytes,
            Parts = parts,
        };
    }

    public async Task CompleteMultipartUploadAsync(
        string objectPath,
        string uploadId,
        IReadOnlyList<UploadCompleteMultipartUploadPart> parts,
        CancellationToken cancellationToken = default
    )
    {
        S3CompleteMultipartUploadRequest request = new()
        {
            BucketName = bucket,
            Key = objectPath,
            UploadId = uploadId,
            PartETags = parts
                .OrderBy(part => part.PartNumber)
                .Select(part => new PartETag(part.PartNumber, part.ETag))
                .ToList(),
        };

        await client.CompleteMultipartUploadAsync(request, cancellationToken);
    }

    public async Task DownloadFileToTemp(
        string objectPath,
        string destinationPath,
        CancellationToken cancellationToken = default
    )
    {
        using TransferUtility transferUtility = new(client);

        await transferUtility.DownloadAsync(destinationPath, bucket, objectPath, cancellationToken);
    }

    public string GetPresignedUrl(
        string objectPath,
        DateTime expires,
        string? downloadFileName = null,
        CancellationToken cancellationToken = default
    )
    {
        GetPreSignedUrlRequest presignRequest = new()
        {
            BucketName = bucket,
            Key = objectPath,
            Verb = HttpVerb.GET,
            Expires = expires,
        };

        if (!string.IsNullOrEmpty(downloadFileName))
        {
            presignRequest.ResponseHeaderOverrides = new ResponseHeaderOverrides
            {
                ContentDisposition =
                    $"attachment; filename=\"{downloadFileName.Replace("\"", "")}\"",
            };
        }

        string url = client.GetPreSignedURL(presignRequest);
        return url;
    }

    public string GetUrl(Guid id)
    {
        return $"{baseOptions.Value.ApiUrl}/files/{id}";
    }

    public async Task<string> ReadTextAsync(
        string objectPath,
        CancellationToken cancellationToken = default
    )
    {
        using GetObjectResponse response = await client.GetObjectAsync(
            new GetObjectRequest { BucketName = bucket, Key = objectPath },
            cancellationToken
        );

        using StreamReader reader = new(response.ResponseStream);
        return await reader.ReadToEndAsync(cancellationToken);
    }

    public async Task UploadFileFromTempAsync(
        string objectPath,
        string sourcePath,
        CancellationToken cancellationToken = default
    )
    {
        const long multipartThreshold = 64L * 1024 * 1024;
        const long partSize = 10L * 1024 * 1024;

        FileInfo fileInfo = new(sourcePath);
        if (!fileInfo.Exists)
            throw new FileNotFoundException("Temp file not found.", sourcePath);

        string mimeType = MediaFiles.GetMimeTypeFromExtension(fileInfo.Extension);

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
                ContentType = mimeType,
            },
            cancellationToken
        );

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
                    IsLastPart = position + currentPartSize >= fileInfo.Length,
                };
                UploadPartResponse uploaded = await client.UploadPartAsync(part, cancellationToken);
                etags.Add(new PartETag(partNumber, uploaded.ETag));
                position += currentPartSize;
                partNumber++;
            }

            await client.CompleteMultipartUploadAsync(
                new S3CompleteMultipartUploadRequest
                {
                    BucketName = bucket,
                    Key = objectPath,
                    UploadId = init.UploadId,
                    PartETags = etags,
                },
                cancellationToken
            );
        }
        catch
        {
            await client.AbortMultipartUploadAsync(
                new AbortMultipartUploadRequest
                {
                    BucketName = bucket,
                    Key = objectPath,
                    UploadId = init.UploadId,
                },
                CancellationToken.None
            );
            throw;
        }
    }
}

public sealed class ContentS3Client(string accessKey, string secretKey, AmazonS3Config cfg)
    : AmazonS3Client(accessKey, secretKey, cfg) { }
