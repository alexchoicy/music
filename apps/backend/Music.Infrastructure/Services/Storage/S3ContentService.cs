using Microsoft.Extensions.Options;
using Music.Core.Models;
using Music.Core.Services.Interfaces;
using Amazon.S3;
using Amazon.S3.Model;

namespace Music.Infrastructure.Services.Storage;

public class S3ContentService(IOptions<StorageOptions> options, Content3Client client) : StorageService(options), IContentService
{
    private readonly string bucket = options.Value.Content!.S3!.BucketName;

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
}

public sealed class Content3Client(string ak, string sk, AmazonS3Config cfg) : AmazonS3Client(ak, sk, cfg)
{
}
