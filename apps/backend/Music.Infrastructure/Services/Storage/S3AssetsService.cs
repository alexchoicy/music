using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;
using Music.Core.Models;
using Music.Core.Services.Interfaces;

namespace Music.Infrastructure.Services.Storage;

public class S3AssetsService : StorageService, IAssetsService
{
    private readonly AssetsS3Client _client;
    private readonly string _bucket;
    private readonly string _accessUrl;

    public S3AssetsService(IOptions<StorageOptions> options, AssetsS3Client client)
        : base(options)
    {
        _client = client;
        StorageOptions cfg = options.Value;
        _bucket = cfg.Assets?.S3?.BucketName
            ?? throw new InvalidOperationException("StorageOptions.Assets.S3.BucketName is not configured.");
        _accessUrl = cfg.Assets?.S3?.AccessURL
            ?? throw new InvalidOperationException("StorageOptions.Assets.S3.AccessURL is not configured.");
    }

    public string CreateUploadUrlAsync(string objectPath, string mimeType, CancellationToken cancellationToken = default)
    {

        GetPreSignedUrlRequest request = new()
        {
            BucketName = _bucket,
            Key = objectPath,
            Verb = HttpVerb.PUT,
            ContentType = mimeType,
            Expires = DateTime.UtcNow.AddMinutes(30), // I dunno
        };

        string url = _client.GetPreSignedURL(request);
        return url;
    }

    public string GetUrl(string objectPath)
    {
        return $"{_accessUrl}/{objectPath}";
    }

    public async Task UploadFileFromTempAsync(string objectPath, string sourcePath, CancellationToken cancellationToken = default)
    {
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

        PutObjectRequest request = new()
        {
            BucketName = _bucket,
            Key = objectPath,
            FilePath = sourcePath,
            ContentType = mimeType,
            DisablePayloadSigning = true
        };

        await _client.PutObjectAsync(request, cancellationToken);
    }
}


public sealed class AssetsS3Client(string ak, string sk, AmazonS3Config cfg) : AmazonS3Client(ak, sk, cfg)
{
}
