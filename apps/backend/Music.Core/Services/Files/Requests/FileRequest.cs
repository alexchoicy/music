using System.ComponentModel.DataAnnotations;
using Music.Core.Common.Utils;

namespace Music.Core.Services.Files.Requests;

public sealed class FileRequest : IValidatableObject
{
    public required string Blake3Hash { get; init; }
    public required string MimeType { get; init; }
    public required long SizeInBytes { get; init; }
    public required string Container { get; init; }
    public required string Extension { get; init; }

    public string? Codec { get; init; }

    public bool Lossless { get; set; }

    public int? AudioChannels { get; set; }

    public int? BitsPerSample { get; set; }

    public int? Width { get; init; }
    public int? Height { get; init; }

    public int? AudioSampleRate { get; init; }
    public int? Bitrate { get; init; }

    public decimal? FrameRate { get; init; }
    public int? DurationInMs { get; init; }

    public required string OriginalFileName { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(Blake3Hash) || !HashHelper.ValidateBlake3Hash(Blake3Hash))
            yield return new ValidationResult("File hash is required.", [nameof(Blake3Hash)]);

        if (string.IsNullOrWhiteSpace(MimeType))
            yield return new ValidationResult("File MIME type is required.", [nameof(MimeType)]);

        if (SizeInBytes <= 0)
            yield return new ValidationResult(
                "File size must be greater than zero.",
                [nameof(SizeInBytes)]
            );

        if (string.IsNullOrWhiteSpace(Extension))
            yield return new ValidationResult("File extension is required.", [nameof(Extension)]);

        if (string.IsNullOrWhiteSpace(OriginalFileName))
            yield return new ValidationResult(
                "Original file name is required.",
                [nameof(OriginalFileName)]
            );
    }
}

public sealed class FileCroppedAreaRequest
{
    public required int Width { get; init; }
    public required int Height { get; init; }
    public required int X { get; init; }
    public required int Y { get; init; }
}
