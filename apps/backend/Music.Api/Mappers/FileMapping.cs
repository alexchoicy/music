using Music.Api.Dtos.Requests;
using Music.Core.Models;

namespace Music.Api.Mappers;

public static class FileMapping
{
    public static FileCroppedAreaModel ToModel(this FileCroppedArea r) => new()
    {
        X = r.X,
        Y = r.Y,
        Width = r.Width,
        Height = r.Height
    };

    public static CreateFileModel ToModel(this FileRequest r) => new()
    {
        FileBlake3 = r.FileBlake3,
        FileSHA1 = r.FileSHA1,
        MimeType = r.MimeType,
        FileSizeInBytes = r.FileSizeInBytes,
        Container = r.Container,
        Extension = r.Extension,
        Codec = r.Codec,
        Width = r.Width,
        Height = r.Height,
        AudioSampleRate = r.AudioSampleRate,
        Bitrate = r.Bitrate,
        FrameRate = r.FrameRate,
        DurationInMs = r.DurationInMs,
        OriginalFileName = r.OriginalFileName
    };
}
