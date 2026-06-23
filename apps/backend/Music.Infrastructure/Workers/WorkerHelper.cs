using Microsoft.Extensions.Logging;
using Music.Core.Storage;

namespace Music.Infrastructure.Workers;

internal static class WorkerFileOperations
{
    public static long GetDirectorySizeInBytes(string sourceDirectory)
    {
        return Directory
            .EnumerateFiles(sourceDirectory, "*", SearchOption.AllDirectories)
            .Sum(path => new FileInfo(path).Length);
    }

    public static async Task UploadDirectoryAsync(
        IContentService contentService,
        string sourceDirectory,
        string destinationRoot,
        ILogger logger,
        CancellationToken cancellationToken
    )
    {
        logger.LogInformation(
            "Uploading directory {SourceDirectory} to {DestinationRoot}",
            sourceDirectory,
            destinationRoot
        );

        foreach (
            string filePath in Directory.EnumerateFiles(
                sourceDirectory,
                "*",
                SearchOption.AllDirectories
            )
        )
        {
            string relativePath = Path.GetRelativePath(sourceDirectory, filePath)
                .Replace('\\', '/');
            string objectPath = $"{destinationRoot.TrimEnd('/')}/{relativePath}";
            await contentService.UploadFileFromTempAsync(
                objectPath,
                filePath,
                cancellationToken: cancellationToken
            );
        }

        logger.LogInformation(
            "Completed uploading directory {SourceDirectory} to {DestinationRoot}",
            sourceDirectory,
            destinationRoot
        );
    }

    public static void TryDeleteTempFile(string? path, ILogger logger)
    {
        if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
        {
            return;
        }

        try
        {
            File.Delete(path);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to delete temporary file {FilePath}", path);
        }
    }

    public static void TryDeleteTempDirectory(string? path, ILogger logger)
    {
        if (string.IsNullOrWhiteSpace(path) || !Directory.Exists(path))
        {
            return;
        }

        try
        {
            Directory.Delete(path, recursive: true);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to delete temporary directory {DirectoryPath}", path);
        }
    }
}
