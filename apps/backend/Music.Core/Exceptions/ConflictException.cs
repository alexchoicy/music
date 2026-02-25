namespace Music.Core.Exceptions;

public sealed class ConflictException(string message) : Exception(message)
{
}
