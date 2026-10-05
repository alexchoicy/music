using System.ComponentModel.DataAnnotations;
using Music.Core.Services.Albums.Results;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;
using Music.Core.Services.Inbox.Enums;

namespace Music.Core.Services.Inbox;

public sealed class CreateInboxGroupRequest
{
    [StringLength(1000)]
    public string? Note { get; init; }

    [Required, MinLength(1), MaxLength(1000)]
    public required IReadOnlyList<InboxItemRequest> Items { get; init; }
}

public sealed class InboxItemRequest : IValidatableObject
{
    public required string ClientReferenceId { get; init; }
    public required FileRequest File { get; init; }
    public required InboxItemTags Tags { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(ClientReferenceId))
            yield return new ValidationResult(
                "ClientReferenceId is required.",
                [nameof(ClientReferenceId)]
            );

        if (File?.MimeType?.StartsWith("audio/", StringComparison.OrdinalIgnoreCase) != true)
            yield return new ValidationResult("Inbox files must be audio files.", [nameof(File)]);
    }
}

public sealed class InboxItemTags
{
    [StringLength(1000)]
    public string? Title { get; init; }

    [StringLength(1000)]
    public string? Album { get; init; }

    public IReadOnlyList<string> Artists { get; init; } = [];
    public IReadOnlyList<string> AlbumArtists { get; init; } = [];
    public int? TrackNumber { get; init; }
    public int? TrackTotal { get; init; }
    public int? DiscNumber { get; init; }
    public int? DiscTotal { get; init; }

    [StringLength(100)]
    public string? Date { get; init; }

    public IReadOnlyList<string> Genres { get; init; } = [];
}

public sealed class InboxItemIdsRequest
{
    [Required, MinLength(1), MaxLength(1000)]
    public required IReadOnlyList<Guid> ItemIds { get; init; }
}

public sealed class CreateInboxGroupResult
{
    public Guid? GroupId { get; init; }
    public required IReadOnlyList<CreateInboxItemResult> Items { get; init; }
}

public sealed class CreateInboxItemResult
{
    public required string ClientReferenceId { get; init; }
    public required string FileName { get; init; }
    public bool IsSuccess { get; init; }
    public string? ErrorMessage { get; init; }
    public CreateAlbumTrackUploadItemResult? Upload { get; init; }
}

public sealed class InboxGroupListItem
{
    public required Guid GroupId { get; init; }
    public string? Note { get; init; }
    public required string UploadedByUserName { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    public required int PendingCount { get; init; }
    public required int ClaimedCount { get; init; }
    public required int DiscardedCount { get; init; }
    public required long TotalSizeInBytes { get; init; }
    public required IReadOnlyList<string> Albums { get; init; }
}

public sealed class InboxGroupDetails
{
    public required Guid GroupId { get; init; }
    public string? Note { get; init; }
    public required string UploadedByUserName { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    public required IReadOnlyList<InboxItemDetails> Items { get; init; }
}

public sealed class InboxItemDetails
{
    public required Guid ItemId { get; init; }
    public required InboxItemStatus Status { get; init; }
    public required int Position { get; init; }
    public required InboxItemTags Tags { get; init; }
    public required FileRequest File { get; init; }
    public required Guid FileObjectId { get; init; }
    public required FileProcessingStatus ProcessingStatus { get; init; }
}
