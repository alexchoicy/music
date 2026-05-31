namespace Music.Core.Shared.Exceptions;

public sealed class ConflictException(string message) : Exception(message) { }
