using Music.Core.Application.Workers;
using Music.Core.Configuration.Options;
using Music.Core.Domain.Files;
using Music.Core.Domain.Files.Enums;
using Music.Core.Entities;

namespace Music.Core.Application.Storage;

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
