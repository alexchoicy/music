using System.Text.Json.Serialization;
using Music.Core.Enums;

namespace Music.Core.Models;

public sealed class CreatePartyModel
{
    public required string Name { get; init; }

    public required PartyType PartyType { get; init; }

    public int LanguageId { get; init; }

    public PartyImageRequest? Cover { get; init; }
    public PartyImageRequest? Banner { get; init; }
}

public sealed class PartyImageRequest
{
    public required PartyImageType ImageType { get; init; }

    public required CreateFileModel Image { get; init; }
    public FileCroppedAreaModel? FileCroppedArea { get; init; }
}

public sealed class PartyListParams
{
    public string? Search { get; set; }
}

public sealed class PartyAliasModel
{
    public required string AliasName { get; init; } = string.Empty;
    public required string AliasNormalizedName { get; init; } = string.Empty;
}

public sealed class PartyListModel
{
    public required int PartyId { get; init; }
    public required string PartyName { get; init; } = string.Empty;
    public required string PartyNormalizedName { get; init; } = string.Empty;
    public required IReadOnlyList<PartyAliasModel> PartyAliases { get; init; } = [];
}



public sealed class PartyModel
{
    public required int PartyId { get; init; }
    public required string PartyName { get; init; } = string.Empty;
    public IReadOnlyList<PartyImageModel>? AvatarImages { get; init; }
    public PartyType Type { get; set; } = PartyType.Individual;

}

public sealed class PartyDetailModel
{
    public required int PartyId { get; init; }
    public required string PartyName { get; init; } = string.Empty;
    public IReadOnlyList<PartyImageModel>? IconUrl { get; init; }
    public IReadOnlyList<PartyImageModel>? BannerUrl { get; init; }
    public PartyType Type { get; set; } = PartyType.Individual;
    public LanguageModel? Language { get; init; }
    public required IReadOnlyList<AlbumListItemModel> PartyAlbums { get; init; } = [];
    public required IReadOnlyList<AlbumListItemModel> PartyPartOfAlbums { get; init; } = [];
}

public sealed class PartyImageModel
{
    public required FileObjectVariant Variant { get; init; }
    public required string Url { get; init; } = string.Empty;
}
