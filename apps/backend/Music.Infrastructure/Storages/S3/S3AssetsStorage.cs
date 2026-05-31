using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;
using Music.Core.Storage;
using Music.Core.Workers;
using Music.Core.Options;
using Music.Core.Common.Utils;

namespace Music.Infrastructure.Storages.S3;

public class S3AssetsService : StorageService, IAssetsService
{
    private readonly AssetsS3Client _client;
    private readonly string _bucket;
    private readonly string _accessUrl;

    public S3AssetsService(
        IOptions<StorageOptions> options,
        AssetsS3Client client,
        IBackgroundTaskQueue backgroundTaskQueue
    )
        : base(options, backgroundTaskQueue)
    {
        _client = client;
        StorageOptions cfg = options.Value;
        _bucket =
            cfg.Assets?.S3?.BucketName
            ?? throw new InvalidOperationException(
                "StorageOptions.Assets.S3.BucketName is not configured."
            );
        _accessUrl =
            cfg.Assets?.S3?.AccessURL
            ?? throw new InvalidOperationException(
                "StorageOptions.Assets.S3.AccessURL is not configured."
            );
    }

    public Task CompleteUploadAsync(string UploadId, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }

    public string CreateUploadUrlAsync(
        string objectPath,
        string mimeType,
        CancellationToken cancellationToken = default
    )
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
        return $"{_accessUrl.TrimEnd('/')}/{objectPath.TrimStart('/')}";
    }

    public async Task UploadFileFromTempAsync(
        string objectPath,
        string sourcePath,
        CancellationToken cancellationToken = default
    )
    {
        FileInfo fileInfo = new(sourcePath);
        if (!fileInfo.Exists)
            throw new FileNotFoundException("Temp file not found.", sourcePath);

        string mimeType = MediaFiles.GetMimeTypeFromExtension(fileInfo.Extension);

        PutObjectRequest request = new()
        {
            BucketName = _bucket,
            Key = objectPath,
            FilePath = sourcePath,
            ContentType = mimeType,
            DisablePayloadSigning = true,
        };

        await _client.PutObjectAsync(request, cancellationToken);
    }
}

public sealed class AssetsS3Client(string accessKey, string secretKey, AmazonS3Config cfg)
    : AmazonS3Client(accessKey, secretKey, cfg) { }
