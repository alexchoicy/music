using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Music.Core.Services.Files.Requests;
using Music.Core.Services.Images.Enums;
using Music.Core.Services.Parties.Enums;

namespace Music.Core.Services.Parties.Requests;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed class UpdatePartyRequest : IValidatableObject
{
    private readonly HashSet<string> supplied = [];
    public bool Has(string name) => supplied.Contains(name);
    public string? Name { get; init { field = value; supplied.Add(nameof(Name)); } }
    public string? Description { get; init { field = value; supplied.Add(nameof(Description)); } }
    public string? MusicBrainzId { get; init { field = value; supplied.Add(nameof(MusicBrainzId)); } }
    [EnumDataType(typeof(CountryCode))]
    public CountryCode? Country { get; init { field = value; supplied.Add(nameof(Country)); } }
    public DateTimeOffset? DebutDate { get; init { field = value; supplied.Add(nameof(DebutDate)); } }
    [EnumDataType(typeof(PartyType))]
    public PartyType? Type { get; init { field = value; supplied.Add(nameof(Type)); } }
    [EnumDataType(typeof(PartyKind))]
    public PartyKind? Kind { get; init { field = value; supplied.Add(nameof(Kind)); } }
    [EnumDataType(typeof(PartyGender))]
    public PartyGender? Gender { get; init { field = value; supplied.Add(nameof(Gender)); } }

    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (Has(nameof(Name)) && string.IsNullOrWhiteSpace(Name))
            yield return new ValidationResult("Name cannot be blank.", [nameof(Name)]);
        if (Has(nameof(Description)) && Description is null)
            yield return new ValidationResult("Description cannot be null.", [nameof(Description)]);
        if (Has(nameof(MusicBrainzId)) && !string.IsNullOrWhiteSpace(MusicBrainzId) && !Guid.TryParse(MusicBrainzId, out _))
            yield return new ValidationResult("MusicBrainzId must be a UUID.", [nameof(MusicBrainzId)]);
        if (Has(nameof(Country)) && Country is null)
            yield return new ValidationResult("Country cannot be null.", [nameof(Country)]);
        if (Has(nameof(Type)) && Type is null)
            yield return new ValidationResult("Type cannot be null.", [nameof(Type)]);
        if (Has(nameof(Kind)) && Kind is null)
            yield return new ValidationResult("Kind cannot be null.", [nameof(Kind)]);
        if (Has(nameof(Gender)) && Gender is null)
            yield return new ValidationResult("Gender cannot be null.", [nameof(Gender)]);
    }
}

public sealed class UpdatePartyExternalInfoRequest
{
    public int? Id { get; init; }
    [EnumDataType(typeof(PartyExternalInfoType))] public required PartyExternalInfoType Type { get; init; }
    [Required, MaxLength(256)] public required string ExternalId { get; init; }
}

public sealed class UpdatePartyImageRequest : IValidatableObject
{
    public int? Id { get; init; }
    public FileRequest? File { get; init; }
    [EnumDataType(typeof(ImageRole))] public required ImageRole ImageRole { get; init; }
    public bool IsPrimary { get; init; }
    public FileCroppedAreaRequest? CroppedArea { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if ((Id.HasValue == (File is not null)) || Id <= 0)
            yield return new ValidationResult("Specify an existing image ID or a new file.");
        if (File is not null && !(File.MimeType?.StartsWith("image/", StringComparison.OrdinalIgnoreCase) ?? false))
            yield return new ValidationResult("The file must be an image.", [nameof(File)]);
        if (CroppedArea is { } crop && (crop.X < 0 || crop.Y < 0 || crop.Width <= 0 || crop.Height <= 0))
            yield return new ValidationResult("Invalid crop dimensions.", [nameof(CroppedArea)]);
    }
}
