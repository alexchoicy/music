using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Music.Core.Enums;

namespace Music.Api.Dtos.Requests;

public sealed class CreateUserRequest
{
    [Required, MinLength(1)]
    public required string Username { get; init; }

    [Required, MinLength(1)]
    public required string Password { get; init; }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public required Roles Role { get; init; }
}
