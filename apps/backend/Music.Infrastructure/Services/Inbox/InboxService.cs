using Microsoft.EntityFrameworkCore;
using Music.Core.Common.Exceptions;
using Music.Core.Entities;
using Music.Core.Options;
using Music.Core.Services.Albums.Results;
using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;
using Music.Core.Services.Inbox;
using Music.Core.Services.Inbox.Enums;
using Music.Core.Storage;
using Music.Infrastructure.Data;

namespace Music.Infrastructure.Services.Inbox;

public class InboxService(AppDbContext dbContext, IContentService contentService) : IInboxService
{
    private readonly AppDbContext _dbContext = dbContext;
    private readonly IContentService _contentService = contentService;

    public async Task<CreateInboxGroupResult> CreateGroupAsync(
        CreateInboxGroupRequest request,
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        List<string> hashes = request.Items.Select(item => item.File.Blake3Hash).ToList();
        HashSet<string> existingHashes = (
            await _dbContext
                .StoredFiles.AsNoTracking()
                .Where(file => hashes.Contains(file.OriginalBlake3Hash))
                .Select(file => file.OriginalBlake3Hash)
                .ToListAsync(cancellationToken)
        ).ToHashSet();

        InboxGroup group = new()
        {
            Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
            UploadedByUserId = userId,
        };

        HashSet<string> seenHashes = [];
        List<CreateInboxItemResult> results = new(request.Items.Count);
        List<(InboxItemRequest Request, FileObject FileObject)> created = [];

        foreach (InboxItemRequest itemRequest in request.Items)
        {
            FileRequest file = itemRequest.File;

            string? errorMessage =
                existingHashes.Contains(file.Blake3Hash) ? "File already exists"
                : !seenHashes.Add(file.Blake3Hash) ? "Duplicate file in this drop"
                : null;

            if (errorMessage is not null)
            {
                results.Add(
                    new CreateInboxItemResult
                    {
                        ClientReferenceId = itemRequest.ClientReferenceId,
                        FileName = file.OriginalFileName,
                        IsSuccess = false,
                        ErrorMessage = errorMessage,
                    }
                );
                continue;
            }

            string path = _contentService.GetStoragePath(
                MediaFolderOptions.OriginalMusic,
                file.Blake3Hash,
                file.MimeType
            );

            (StoredFile storedFile, FileObject fileObject) =
                _contentService.CreateStoredFileWithObject(
                    file,
                    FileType.Audio,
                    path,
                    StorageArea.Content,
                    FileObjectVariant.Original,
                    userId
                );

            InboxItemTags tags = itemRequest.Tags;
            group.Items.Add(
                new InboxItem
                {
                    File = storedFile,
                    Position = created.Count,
                    Title = CleanTag(tags.Title),
                    Album = CleanTag(tags.Album),
                    Artists = CleanTags(tags.Artists),
                    AlbumArtists = CleanTags(tags.AlbumArtists),
                    TrackNumber = tags.TrackNumber,
                    TrackTotal = tags.TrackTotal,
                    DiscNumber = tags.DiscNumber,
                    DiscTotal = tags.DiscTotal,
                    Date = CleanTag(tags.Date),
                    Genres = CleanTags(tags.Genres),
                }
            );

            _dbContext.StoredFiles.Add(storedFile);
            _dbContext.FileObjects.Add(fileObject);
            created.Add((itemRequest, fileObject));
        }

        if (created.Count == 0)
            return new CreateInboxGroupResult { GroupId = null, Items = results };

        _dbContext.InboxGroups.Add(group);
        await _dbContext.SaveChangesAsync(cancellationToken);

        foreach ((InboxItemRequest itemRequest, FileObject fileObject) in created)
        {
            results.Add(
                new CreateInboxItemResult
                {
                    ClientReferenceId = itemRequest.ClientReferenceId,
                    FileName = itemRequest.File.OriginalFileName,
                    IsSuccess = true,
                    Upload = new CreateAlbumTrackUploadItemResult
                    {
                        FileObjectId = fileObject.Id,
                        Blake3Hash = itemRequest.File.Blake3Hash,
                        FileName = itemRequest.File.OriginalFileName,
                        MultipartUploadInfo = await _contentService.CreateMultipartUploadAsync(
                            fileObject.StoragePath,
                            fileObject.MimeType,
                            fileObject.SizeInBytes,
                            cancellationToken
                        ),
                    },
                }
            );
        }

        return new CreateInboxGroupResult { GroupId = group.Id, Items = results };
    }

    public async Task<IReadOnlyList<InboxGroupListItem>> GetGroupsAsync(
        bool includeResolved,
        CancellationToken cancellationToken = default
    )
    {
        IQueryable<InboxGroup> query = _dbContext.InboxGroups.AsNoTracking();

        if (!includeResolved)
            query = query.Where(group =>
                group.Items.Any(item => item.Status == InboxItemStatus.Pending)
            );

        var groups = await query
            .OrderByDescending(group => group.CreatedAt)
            .Select(group => new
            {
                group.Id,
                group.Note,
                group.CreatedAt,
                UploadedByUserName = _dbContext
                    .Users.Where(user => user.Id == group.UploadedByUserId)
                    .Select(user => user.UserName)
                    .FirstOrDefault(),
                Items = group
                    .Items.Select(item => new
                    {
                        item.Status,
                        item.Album,
                        SizeInBytes = item.File!.FileObjects.Where(fileObject =>
                                fileObject.FileObjectVariant == FileObjectVariant.Original
                            )
                            .Select(fileObject => fileObject.SizeInBytes)
                            .FirstOrDefault(),
                    })
                    .ToList(),
            })
            .ToListAsync(cancellationToken);

        return groups
            .Select(group => new InboxGroupListItem
            {
                GroupId = group.Id,
                Note = group.Note,
                UploadedByUserName = group.UploadedByUserName ?? string.Empty,
                CreatedAt = group.CreatedAt,
                PendingCount = group.Items.Count(item => item.Status == InboxItemStatus.Pending),
                ClaimedCount = group.Items.Count(item => item.Status == InboxItemStatus.Claimed),
                DiscardedCount = group.Items.Count(item =>
                    item.Status == InboxItemStatus.Discarded
                ),
                TotalSizeInBytes = group.Items.Sum(item => item.SizeInBytes),
                Albums = group
                    .Items.Select(item => item.Album)
                    .OfType<string>()
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList(),
            })
            .ToList();
    }

    public async Task<InboxGroupDetails> GetGroupAsync(
        Guid groupId,
        CancellationToken cancellationToken = default
    )
    {
        InboxGroup group =
            await _dbContext
                .InboxGroups.AsNoTracking()
                .AsSplitQuery()
                .Include(group => group.Items)
                    .ThenInclude(item => item.File)
                        .ThenInclude(file => file!.FileObjects)
                .FirstOrDefaultAsync(group => group.Id == groupId, cancellationToken)
            ?? throw new EntityNotFoundException("Inbox group not found");

        string? userName = await _dbContext
            .Users.Where(user => user.Id == group.UploadedByUserId)
            .Select(user => user.UserName)
            .FirstOrDefaultAsync(cancellationToken);

        List<InboxItemDetails> items = [];

        foreach (InboxItem item in group.Items.OrderBy(item => item.Position))
        {
            FileObject? original = item.File?.FileObjects.FirstOrDefault(fileObject =>
                fileObject.FileObjectVariant == FileObjectVariant.Original
            );

            if (item.File is null || original is null)
                continue;

            items.Add(
                new InboxItemDetails
                {
                    ItemId = item.Id,
                    Status = item.Status,
                    Position = item.Position,
                    Tags = new InboxItemTags
                    {
                        Title = item.Title,
                        Album = item.Album,
                        Artists = item.Artists,
                        AlbumArtists = item.AlbumArtists,
                        TrackNumber = item.TrackNumber,
                        TrackTotal = item.TrackTotal,
                        DiscNumber = item.DiscNumber,
                        DiscTotal = item.DiscTotal,
                        Date = item.Date,
                        Genres = item.Genres,
                    },
                    File = new FileRequest
                    {
                        Blake3Hash = item.File.OriginalBlake3Hash,
                        MimeType = original.MimeType,
                        SizeInBytes = original.SizeInBytes,
                        Container = original.Container,
                        Extension = original.Extension,
                        Codec = original.Codec,
                        Lossless = original.Lossless,
                        AudioChannels = original.AudioChannels,
                        BitsPerSample = original.BitsPerSample,
                        AudioSampleRate = original.AudioSampleRate,
                        Bitrate = original.Bitrate,
                        DurationInMs = original.DurationInMs,
                        OriginalFileName = item.File.OriginalFileName,
                    },
                    FileObjectId = original.Id,
                    ProcessingStatus = original.ProcessingStatus,
                }
            );
        }

        return new InboxGroupDetails
        {
            GroupId = group.Id,
            Note = group.Note,
            UploadedByUserName = userName ?? string.Empty,
            CreatedAt = group.CreatedAt,
            Items = items,
        };
    }

    public Task DiscardItemsAsync(
        IReadOnlyList<Guid> itemIds,
        CancellationToken cancellationToken = default
    ) =>
        SetItemStatusAsync(
            itemIds,
            InboxItemStatus.Pending,
            InboxItemStatus.Discarded,
            cancellationToken
        );

    public Task RestoreItemsAsync(
        IReadOnlyList<Guid> itemIds,
        CancellationToken cancellationToken = default
    ) =>
        SetItemStatusAsync(
            itemIds,
            InboxItemStatus.Discarded,
            InboxItemStatus.Pending,
            cancellationToken
        );

    private async Task SetItemStatusAsync(
        IReadOnlyList<Guid> itemIds,
        InboxItemStatus from,
        InboxItemStatus to,
        CancellationToken cancellationToken
    )
    {
        List<InboxItem> items = await _dbContext
            .InboxItems.Where(item => itemIds.Contains(item.Id))
            .ToListAsync(cancellationToken);

        if (items.Count != itemIds.Distinct().Count())
            throw new EntityNotFoundException("Inbox item not found");

        if (items.Any(item => item.Status != from && item.Status != to))
            throw new ConflictException($"Only {from} inbox items can be changed to {to}");

        DateTimeOffset now = DateTimeOffset.UtcNow;
        foreach (InboxItem item in items.Where(item => item.Status == from))
        {
            item.Status = to;
            item.UpdatedAt = now;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private static string? CleanTag(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static List<string> CleanTags(IReadOnlyList<string>? values) =>
        (values ?? [])
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value.Trim())
            .Distinct()
            .ToList();
}
