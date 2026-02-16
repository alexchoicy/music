using Music.Core.Entities;
using Music.Core.Enums;
using Music.Core.Models;

namespace Music.Core.Services.Interfaces;

public interface IStorageService
{
    public string GetStoragePath(MediaFolderOptions variant, string blake3Hash, string mimeType);
    public (StoredFile storedFile, FileObject fileObject) CreateStoredFileWithObject(
        CreateFileModel model,
        FileType fileType,
        string storagePath,
        string userId);
}
