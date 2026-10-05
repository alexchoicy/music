namespace Music.Core.Services.Inbox;

public interface IInboxService
{
    Task<CreateInboxGroupResult> CreateGroupAsync(
        CreateInboxGroupRequest request,
        string userId,
        CancellationToken cancellationToken = default
    );

    Task<IReadOnlyList<InboxGroupListItem>> GetGroupsAsync(
        bool includeResolved,
        CancellationToken cancellationToken = default
    );

    Task<InboxGroupDetails> GetGroupAsync(
        Guid groupId,
        CancellationToken cancellationToken = default
    );

    Task DiscardItemsAsync(
        IReadOnlyList<Guid> itemIds,
        CancellationToken cancellationToken = default
    );

    Task RestoreItemsAsync(
        IReadOnlyList<Guid> itemIds,
        CancellationToken cancellationToken = default
    );
}
