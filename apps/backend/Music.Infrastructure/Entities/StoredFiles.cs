using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using Music.Core.Enums;

namespace Music.Infrastructure.Entities;

[Table("StoredFiles")]
[PrimaryKey(nameof(Id))]
public class StoredFile
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    public required FileType Type { get; set; }

    // It will have the orginal file object, thumbnails, transcoded version
    public ICollection<FileObject> FileObjects { get; set; } = [];
    public ICollection<TrackSource> TrackSources { get; set; } = [];
}
