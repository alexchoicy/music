using System.ComponentModel.DataAnnotations;
using Music.Core.Common.Utils;
using Music.Core.Services.Concerts;
using Music.Core.Services.Concerts.Enums;
using Music.Core.Services.Concerts.Requests;
using Music.Core.Services.Concerts.Results;
using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;

namespace Music.Core.Services.Concerts.Requests;

public sealed class CreateConcertRequest : IValidatableObject
{
    private static readonly string[] VideoExtensions = [".mkv", ".mov", ".mp4", ".webm"];

    public required string Title { get; init; }
    public string Description { get; init; } = string.Empty;
    public DateTimeOffset? Date { get; init; }

    public ConcertImageRequest? Image { get; init; }
    public IReadOnlyList<int> LinkedAlbumIds { get; init; } = [];
    public IReadOnlyList<ConcertPartyRequest> LinkedParties { get; init; } = [];
    public IReadOnlyList<ConcertFileRequest> Files { get; init; } = [];

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(Title))
            yield return new ValidationResult("Concert title is required.", [nameof(Title)]);

        if (Files is null)
        {
            yield return new ValidationResult("Concert files are required.", [nameof(Files)]);
            yield break;
        }

        if (Files.Any(file => file is null))
            yield return new ValidationResult(
                "Concert file entries cannot be null.",
                [nameof(Files)]
            );

        foreach (ConcertFileRequest? file in Files)
        {
            if (file is null)
                continue;

            if (string.IsNullOrWhiteSpace(file.Title))
                yield return new ValidationResult(
                    "Concert file title is required.",
                    [nameof(Files)]
                );

            if (file.Order < 0)
                yield return new ValidationResult(
                    "Concert file order must be at least 0.",
                    [nameof(Files)]
                );

            if (
                string.IsNullOrWhiteSpace(file.SimpleBlake3Hash)
                || !HashHelper.ValidateBlake3Hash(file.SimpleBlake3Hash)
            )
                yield return new ValidationResult(
                    "Concert file hash is required.",
                    [nameof(Files)]
                );

            if (!IsVideoFile(file))
                yield return new ValidationResult(
                    "Concert files must be video files.",
                    [nameof(Files)]
                );

            if (file.SizeInBytes <= 0)
                yield return new ValidationResult(
                    "Concert file size must be greater than zero.",
                    [nameof(Files)]
                );

            if (string.IsNullOrWhiteSpace(file.OriginalFileName))
                yield return new ValidationResult(
                    "Concert original file name is required.",
                    [nameof(Files)]
                );
        }

        if (Image is not null)
        {
            if (Image.File is null)
                yield return new ValidationResult(
                    "Concert image file metadata is required.",
                    [nameof(Image)]
                );
            else if (
                Image.File.MimeType?.StartsWith("image/", StringComparison.OrdinalIgnoreCase)
                != true
            )
                yield return new ValidationResult(
                    "Concert image must be an image file.",
                    [nameof(Image)]
                );
        }

        if (LinkedAlbumIds is null)
            yield return new ValidationResult(
                "Linked albums are required.",
                [nameof(LinkedAlbumIds)]
            );

        if (LinkedParties is null)
            yield return new ValidationResult(
                "Linked parties are required.",
                [nameof(LinkedParties)]
            );
    }

    private static bool IsVideoFile(ConcertFileRequest file)
    {
        if (file.MimeType?.StartsWith("video/", StringComparison.OrdinalIgnoreCase) == true)
            return true;

        string extension = Path.GetExtension(file.OriginalFileName);
        return VideoExtensions.Contains(extension, StringComparer.OrdinalIgnoreCase);
    }
}

public sealed class ConcertImageRequest
{
    public required FileRequest File { get; init; }
    public FileCroppedAreaRequest? CroppedArea { get; init; }
}

public sealed class ConcertPartyRequest
{
    public required int PartyId { get; init; }
    public required ConcertPartyRole Role { get; init; }
}

public sealed class ConcertFileRequest
{
    public required string Title { get; init; }
    public required ConcertFileType Type { get; init; }
    public int Order { get; init; } = 0;
    public MediaSource Source { get; set; } = MediaSource.Unknown;
    public string? SourceUrl { get; set; }

    public required string SimpleBlake3Hash { get; init; }
    public required string MimeType { get; init; }
    public required long SizeInBytes { get; init; }
    public required string OriginalFileName { get; init; }
}
