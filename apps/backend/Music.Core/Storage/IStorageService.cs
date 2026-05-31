using Music.Core.Workers;
using Music.Core.Options;
using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;
using Music.Core.Entities;

namespace Music.Core.Storage;

public interface IStorageService
{
    string GetStoragePath(
        MediaFolderOptions variant,
        string blake3Hash,
        string mimeType,
        string fileName = ""
    );

    string GetWaveformStoragePath(int trackAudioId);

    (StoredFile storedFile, FileObject fileObject) CreateStoredFileWithObject(
        FileRequest request,
        FileType fileType,
        string storagePath,
        StorageArea storageArea,
        FileObjectType fileObjectType,
        FileObjectVariant fileObjectVariant,
        string userId,
        MediaSource source = MediaSource.UserUpload,
        string? sourceUrl = null
    );

    ValueTask RunBackgroundProcessUploadFileAsync(
        WorkerModel worker,
        CancellationToken cancellationToken = default
    );
}
