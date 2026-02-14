using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;
using Music.Core.Models;
using Music.Core.Services.Interfaces;

namespace Music.Infrastructure.Services.Storage;

public class S3AssetsService(IOptions<StorageOptions> options, AssetsS3Client client) : StorageService(options), IAssetsService
{
    private readonly string bucket = options.Value.Assets!.S3!.BucketName;

    public string CreateUploadUrlAsync(string objectPath, string mimeType, CancellationToken cancellationToken = default)
    {

        GetPreSignedUrlRequest request = new()
        {
            BucketName = bucket,
            Key = objectPath,
            Verb = HttpVerb.PUT,
            ContentType = mimeType,
            Expires = DateTime.UtcNow.AddMinutes(30), // I dunno
        };

        string url = client.GetPreSignedURL(request);
        return url;
    }

    public string GetUrl(string objectPath, CancellationToken cancellationToken = default)
    {
        return $"{options.Value.Assets.S3!.AccessURL}/{objectPath}";
    }
}


public sealed class AssetsS3Client(string ak, string sk, AmazonS3Config cfg) : AmazonS3Client(ak, sk, cfg)
{
}
