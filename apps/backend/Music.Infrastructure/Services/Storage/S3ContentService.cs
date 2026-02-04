using Microsoft.Extensions.Options;
using Music.Core.Models;
using Music.Core.Services.Interfaces;

namespace Music.Infrastructure.Services.Storage;

public class S3ContentService(IOptions<StorageOptions> options) : StorageService(options), IContentService
{
}
