namespace Music.Core.Services.Interfaces;

public interface IHashService
{
    public string ComputeBlake3Hash(string sourcePath);
}
