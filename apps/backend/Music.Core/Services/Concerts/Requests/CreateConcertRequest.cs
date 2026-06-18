using Music.Core.Services.Concerts;
using Music.Core.Services.Concerts.Enums;
using Music.Core.Services.Concerts.Requests;
using Music.Core.Services.Concerts.Results;
using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;

namespace Music.Core.Services.Concerts.Requests;

public sealed class CreateConcertRequest
{
    public required string Title { get; init; }
    public string Description { get; init; } = string.Empty;
    public DateTimeOffset? Date { get; init; }

    public ConcertImageRequest? Image { get; init; }
    public IReadOnlyList<int> LinkedAlbumIds { get; init; } = [];
    public IReadOnlyList<ConcertPartyRequest> LinkedParties { get; init; } = [];
    public IReadOnlyList<ConcertFileRequest> Files { get; init; } = [];
}

public sealed class ConcertImageRequest
{
    public required FileRequest File { get; init; }
    public FileCroppedAreaRequest? CroppedArea { get; init; }
}

public sealed class ConcertPartyRequest
{
    public required int PartyId { get; init; }
    public required ConcertPartyRole Role { get; init; }
}

public sealed class ConcertFileRequest
{
    public required string Title { get; init; }
    public required ConcertFileType Type { get; init; }
    public int Order { get; init; } = 0;

    public required string SimpleBlake3Hash { get; init; }
    public required string MimeType { get; init; }
    public required long SizeInBytes { get; init; }
    public required string OriginalFileName { get; init; }
}
