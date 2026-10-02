namespace Music.Core.Services.Playlists;

public interface IPlaylistService
{
    Task<IReadOnlyList<PlaylistListItem>> GetAllAsync(
        string userId,
        CancellationToken cancellationToken = default
    );
    Task<PlaylistDetails> GetByIdAsync(
        int playlistId,
        string userId,
        CancellationToken cancellationToken = default
    );
    Task<PlaylistDetails> CreateAsync(
        CreatePlaylistRequest request,
        string userId,
        CancellationToken cancellationToken = default
    );
    Task RenameAsync(
        int playlistId,
        RenamePlaylistRequest request,
        string userId,
        CancellationToken cancellationToken = default
    );
    Task DeleteAsync(
        int playlistId,
        uint version,
        string userId,
        CancellationToken cancellationToken = default
    );
    Task AddEntriesAsync(
        int playlistId,
        AddPlaylistEntriesRequest request,
        string userId,
        CancellationToken cancellationToken = default
    );
    Task RemoveEntryAsync(
        int playlistId,
        int entryId,
        uint version,
        string userId,
        CancellationToken cancellationToken = default
    );
    Task ReorderEntriesAsync(
        int playlistId,
        ReorderPlaylistEntriesRequest request,
        string userId,
        CancellationToken cancellationToken = default
    );
}
