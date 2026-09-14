using System.ComponentModel.DataAnnotations;
using Music.Core.Services.Parties.Enums;

namespace Music.Core.Services.Parties.Requests;

public sealed class PartyAliasWriteRequest
{
    public int? Id { get; init; }
    [Required] public required string Name { get; init; }
}

public sealed class PartyAliasBatchRequest : PartyBatchRequest<PartyAliasWriteRequest> { }
public sealed class PartyExternalInfoBatchRequest : PartyBatchRequest<UpdatePartyExternalInfoRequest> { }
public sealed class PartyImageBatchRequest : PartyBatchRequest<UpdatePartyImageRequest> { }

public abstract class PartyBatchRequest<T> : IValidatableObject
{
    [Required] public List<T> Upsert { get; init; } = [];
    [Required] public List<int> Delete { get; init; } = [];

    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (Upsert?.Any(item => item is null) == true)
            yield return new ValidationResult("Upsert cannot contain null entries.");
        if (Delete is not null && (Delete.Any(id => id <= 0) || Delete.Distinct().Count() != Delete.Count))
            yield return new ValidationResult("Delete must contain distinct positive IDs.");
    }
}
