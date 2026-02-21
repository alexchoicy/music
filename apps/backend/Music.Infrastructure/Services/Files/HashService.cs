using Blake3;
using Music.Core.Services.Interfaces;

namespace Music.Infrastructure.Services.Files;

public sealed class HashService : IHashService
{
    public string ComputeBlake3Hash(string sourcePath)
    {
        if (string.IsNullOrWhiteSpace(sourcePath))
            throw new ArgumentException("Value cannot be null or empty.", nameof(sourcePath));

        using FileStream fileStream = File.OpenRead(sourcePath);

        using var blake3Stream = new Blake3Stream(fileStream);

        return blake3Stream.ComputeHash().ToString();
    }
}
