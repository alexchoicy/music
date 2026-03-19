namespace Music.Core.Services.Interfaces;

public interface IHashService
{
    public Task<string> ComputeBlake3HashAsync(string sourcePath, CancellationToken cancellationToken);
}
