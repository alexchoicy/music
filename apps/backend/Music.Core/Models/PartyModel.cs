using Music.Core.Enums;

namespace Music.Core.Models;

public sealed class CreatePartyModel
{
    public required string Name { get; init; }

    public required PartyType PartyType { get; init; }

    public int LanguageId { get; init; }
}

public sealed class PartyListParams
{
    public string? Serach { get; set; }
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
