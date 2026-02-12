using Amazon.S3;
using Microsoft.Extensions.Options;
using Music.Core.Models;
using Music.Core.Services.Interfaces;

namespace Music.Infrastructure.Services.Storage;

public class S3AssetsService(IOptions<StorageOptions> options, AssetsS3Client client) : StorageService(options), IAssetsService
{
    private readonly string bucket = options.Value.Assets!.S3!.BucketName;

    public Task<string> CreateUploadUrlAsync(string objectPath, string mimeType, CancellationToken cancellationToken = default)
    {
        return Task.FromResult($"{objectPath} (upload URL generation not implemented) ${mimeType}");
    }
}


public sealed class AssetsS3Client(string ak, string sk, AmazonS3Config cfg) : AmazonS3Client(ak, sk, cfg)
{
}
