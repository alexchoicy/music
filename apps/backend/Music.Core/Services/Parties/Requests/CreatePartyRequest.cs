using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;
using Music.Core.Services.Parties;
using Music.Core.Services.Parties.Enums;
using Music.Core.Services.Parties.Requests;

namespace Music.Core.Services.Parties.Requests;

public sealed class CreatePartyRequest
{
    public required string Name { get; init; }
    public required PartyType Type { get; init; }
    public required PartyKind Kind { get; init; }
    public required CountryCode Country { get; init; }

    public string? MusicBrainzID { get; init; }

    public PartyImageRequest? Avatar { get; init; }
    public PartyImageRequest? Banner { get; init; }
}

public sealed class PartyImageRequest
{
    public required FileRequest File { get; init; }
    public FileCroppedAreaRequest? CroppedArea { get; init; }
}
