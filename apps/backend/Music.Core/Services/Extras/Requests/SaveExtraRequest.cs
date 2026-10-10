using System.ComponentModel.DataAnnotations;
using Music.Core.Services.Extras.Enums;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;

namespace Music.Core.Services.Extras.Requests;

// Full state of an extra. Assets are stored in the given order.
// Existing assets are referenced by AssetId, new uploads by File.
// Existing assets missing from the list are removed.
public sealed class SaveExtraRequest : IValidatableObject
{
    public required string Title { get; init; }
    public string Description { get; init; } = string.Empty;
    public ExtraCategory Category { get; init; } = ExtraCategory.Other;
    public MediaSource Source { get; init; } = MediaSource.Unknown;

    public IReadOnlyList<SaveExtraAssetRequest> Assets { get; init; } = [];

    // Index into Assets, must point to an image asset
    public int? CoverAssetIndex { get; init; }
    public FileCroppedAreaRequest? CoverCroppedArea { get; init; }

    // Required when updating
    public uint? Version { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(Title))
            yield return new ValidationResult("Extra title is required.", [nameof(Title)]);

        if (Assets is null)
        {
            yield return new ValidationResult("Extra assets are required.", [nameof(Assets)]);
            yield break;
        }

        foreach (SaveExtraAssetRequest? asset in Assets)
        {
            if (asset is null)
            {
                yield return new ValidationResult(
                    "Extra asset entries cannot be null.",
                    [nameof(Assets)]
                );
                continue;
            }

            if ((asset.AssetId is null) == (asset.File is null))
                yield return new ValidationResult(
                    "Each extra asset must reference either an existing asset or a new file.",
                    [nameof(Assets)]
                );
        }

        if (
            Assets
                .Where(asset => asset?.File is not null)
                .GroupBy(asset => asset.File!.Blake3Hash)
                .Any(group => group.Count() > 1)
        )
            yield return new ValidationResult(
                "The same file cannot be added twice.",
                [nameof(Assets)]
            );

        if (
            Assets
                .Where(asset => asset?.AssetId is not null)
                .GroupBy(asset => asset.AssetId)
                .Any(group => group.Count() > 1)
        )
            yield return new ValidationResult(
                "The same asset cannot be referenced twice.",
                [nameof(Assets)]
            );

        if (CoverAssetIndex is not null)
        {
            if (CoverAssetIndex < 0 || CoverAssetIndex >= Assets.Count)
                yield return new ValidationResult(
                    "Cover asset index is out of range.",
                    [nameof(CoverAssetIndex)]
                );
            else if (
                Assets[CoverAssetIndex.Value]?.File is { } coverFile
                && !coverFile.MimeType.StartsWith("image/", StringComparison.OrdinalIgnoreCase)
            )
                yield return new ValidationResult(
                    "Cover asset must be an image.",
                    [nameof(CoverAssetIndex)]
                );
        }
    }
}

public sealed class SaveExtraAssetRequest
{
    public Guid? AssetId { get; init; }
    public FileRequest? File { get; init; }
    public string? Title { get; init; }
}
