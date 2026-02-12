using Microsoft.Extensions.Options;
using Music.Core.Models;
using Music.Core.Services.Interfaces;
using Amazon.S3;

namespace Music.Infrastructure.Services.Storage;

public class S3ContentService(IOptions<StorageOptions> options, Content3Client client) : StorageService(options), IContentService
{
    private readonly string bucket = options.Value.Content!.S3!.BucketName;

    public Task<string> CreateUploadUrlAsync(string objectPath, string mimeType, CancellationToken cancellationToken = default)
    {
        return Task.FromResult($"{objectPath} (upload URL generation not implemented) ${mimeType}");
    }
}

public sealed class Content3Client(string ak, string sk, AmazonS3Config cfg) : AmazonS3Client(ak, sk, cfg)
{
}
