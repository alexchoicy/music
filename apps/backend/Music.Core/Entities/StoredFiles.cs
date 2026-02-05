using Music.Core.Enums;

namespace Music.Core.Entities;

public class StoredFile
{
    public int Id { get; set; }

    public required FileType Type { get; set; }

    // It will have the orginal file object, thumbnails, transcoded version
    public ICollection<FileObject> FileObjects { get; set; } = [];
    public ICollection<TrackSource> TrackSources { get; set; } = [];
}
