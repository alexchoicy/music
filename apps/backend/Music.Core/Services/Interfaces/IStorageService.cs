using Music.Core.Enums;

namespace Music.Core.Services.Interfaces;

public interface IStorageService
{
    public string GetStoragePath(MediaFolderOptions variant, string blake3Hash, string extension);
}
