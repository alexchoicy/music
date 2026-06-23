namespace Music.Core.Common.Exceptions;

public sealed class ConflictException(string message) : Exception(message) { }
