using Blake3;
using Music.Core.Services.Interfaces;

namespace Music.Infrastructure.Services.Files;

public sealed class HashService : IHashService
{
    public async Task<string> ComputeBlake3HashAsync(string sourcePath, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(sourcePath))
            throw new ArgumentException("Value cannot be null or empty.", nameof(sourcePath));
        await using FileStream fileStream = new(
            sourcePath,
            FileMode.Open,
            FileAccess.Read,
            FileShare.Read,
            bufferSize: 81920,
            FileOptions.Asynchronous | FileOptions.SequentialScan);
        using var hasher = Hasher.New();
        byte[] buffer = new byte[81920];
        int bytesRead;
        while ((bytesRead = await fileStream.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellationToken)) > 0)
        {
            hasher.Update(buffer.AsSpan(0, bytesRead));
        }
        return hasher.Finalize().ToString();
    }
}
