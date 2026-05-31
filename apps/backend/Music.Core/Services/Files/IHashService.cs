namespace Music.Core.Services.Files;

public interface IHashService
{
    Task<string> ComputeBlake3HashAsync(string sourcePath, CancellationToken cancellationToken);
}
