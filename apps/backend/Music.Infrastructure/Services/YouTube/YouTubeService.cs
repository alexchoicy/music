using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Music.Core.Common.Enums;
using Music.Core.Common.Exceptions;
using Music.Core.Common.Utils;
using Music.Core.Entities;
using Music.Core.Options;
using Music.Core.Services.Albums.Enums;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Parties.Enums;
using Music.Core.Services.Tracks.Enums;
using Music.Core.Services.YouTube;
using Music.Core.Workers;
using Music.Infrastructure.Data;
using Music.Infrastructure.Utils;

namespace Music.Infrastructure.Services.YouTube;

public partial class YouTubeService(
    AppDbContext dbContext,
    IBackgroundTaskQueue backgroundTaskQueue,
    IHttpClientFactory httpClientFactory,
    IOptions<ExternalOptions> externalOptions,
    ILogger<YouTubeService> logger
) : IYouTubeService
{
    // seeded unknown artist
    private const int UnknownPartyId = 1;
    private const int MaxThumbnailCandidates = 6;
    private const int MaxPartySuggestions = 5;

    private static readonly HashSet<string> YouTubeHosts = new(StringComparer.OrdinalIgnoreCase)
    {
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "music.youtube.com",
        "youtu.be",
    };

    private readonly AppDbContext _dbContext = dbContext;
    private readonly IBackgroundTaskQueue _backgroundTaskQueue = backgroundTaskQueue;
    private readonly IHttpClientFactory _httpClientFactory = httpClientFactory;
    private readonly ExternalOptions _externalOptions = externalOptions.Value;
    private readonly ILogger<YouTubeService> _logger = logger;

    public async Task<YouTubeVideoInfo> GetVideoInfoAsync(
        string url,
        CancellationToken cancellationToken = default
    )
    {
        (YouTubeVideoInfo info, IReadOnlyList<string> thumbnails) = await FetchVideoInfoAsync(
            url,
            cancellationToken
        );

        return new YouTubeVideoInfo
        {
            VideoId = info.VideoId,
            Title = info.Title,
            WebpageUrl = info.WebpageUrl,
            Channel = info.Channel,
            ChannelId = info.ChannelId,
            ChannelHandle = info.ChannelHandle,
            DurationInMs = info.DurationInMs,
            UploadDate = info.UploadDate,
            ThumbnailUrl = await FindAvailableThumbnailAsync(thumbnails, cancellationToken),
            SuggestedParties = await FindPartySuggestionsAsync(info, cancellationToken),
        };
    }

    public async Task<CreateYouTubeCoverResult> CreateCoverAsync(
        CreateYouTubeCoverRequest request,
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        (YouTubeVideoInfo info, _) = await FetchVideoInfoAsync(request.Url, cancellationToken);

        if (request.ThumbnailUrl is not null && !IsYouTubeThumbnailUrl(request.ThumbnailUrl))
            throw new ValidationException("Thumbnail must be a YouTube thumbnail URL.");

        bool alreadyImported = await _dbContext.StoredFiles.AnyAsync(
            file => file.Source == MediaSource.YouTube && file.SourceUrl == info.WebpageUrl,
            cancellationToken
        );

        if (alreadyImported)
            throw new ConflictException("This YouTube video has already been imported.");

        List<int> partyIds = request.PartyIds.Distinct().ToList();

        int existingPartyCount = await _dbContext.Parties.CountAsync(
            party => partyIds.Contains(party.Id),
            cancellationToken
        );

        if (existingPartyCount != partyIds.Count)
            throw new EntityNotFoundException("One or more parties were not found.");

        if (
            request.BasedOnTrackId is int basedOnTrackId
            && !await _dbContext.Tracks.AnyAsync(t => t.Id == basedOnTrackId, cancellationToken)
        )
            throw new EntityNotFoundException($"Track {basedOnTrackId} not found.");

        PartyExternalInfo? channelLink = await CreateChannelLinkAsync(
            info,
            request.LinkChannelToPartyId,
            userId,
            cancellationToken
        );

        int? languageId = request.LanguageId == 0 ? null : request.LanguageId;
        string title = request.Title.Trim();

        Core.Entities.Album album = new()
        {
            Title = title,
            Description = $"{info.Title}\n{info.WebpageUrl}",
            Type = AlbumType.Single,
            LanguageId = languageId,
            ReleaseDate = info.UploadDate,
            CreatedByUserId = userId,
        };

        IEnumerable<int> albumPartyIds = partyIds.Count > 0 ? partyIds : [UnknownPartyId];

        foreach (int partyId in albumPartyIds)
        {
            album.Credits.Add(new AlbumCredit { PartyId = partyId, Credit = CreditType.Artist });
        }

        Track track = new()
        {
            Title = title,
            Description = info.Title,
            DurationInMs = info.DurationInMs,
            VersionType = TrackVersionType.Cover,
            ContentType = TrackContentType.Music,
            LanguageId = languageId,
            BasedOnTrackId = request.BasedOnTrackId,
            CreatedByUserId = userId,
        };

        foreach (int partyId in partyIds)
        {
            track.Credits.Add(new TrackCredit { PartyId = partyId, Credit = CreditType.Artist });
        }

        AlbumDisc disc = new() { Album = album, DiscNumber = 1 };
        disc.Tracks.Add(
            new AlbumTrack
            {
                AlbumDisc = disc,
                Track = track,
                TrackNumber = 1,
            }
        );
        album.Discs.Add(disc);

        await using IDbContextTransaction transaction =
            await _dbContext.Database.BeginTransactionAsync(cancellationToken);

        _dbContext.Albums.Add(album);

        if (channelLink is not null)
            _dbContext.PartyExternalInfos.Add(channelLink);

        await _dbContext.SaveChangesAsync(cancellationToken);

        Guid jobId = _backgroundTaskQueue.StageWorker(
            new YouTubeCoverImportWorker
            {
                TrackId = track.Id,
                Url = info.WebpageUrl,
                UserId = userId,
                ThumbnailUrl = request.ThumbnailUrl,
                CroppedArea = request.CroppedArea,
            },
            _dbContext
        );

        await _dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        _backgroundTaskQueue.NotifyWorker(jobId);

        _logger.LogInformation(
            "Queued YouTube cover import {JobId} for {Url} as album {AlbumId}, track {TrackId}",
            jobId,
            info.WebpageUrl,
            album.Id,
            track.Id
        );

        return new CreateYouTubeCoverResult
        {
            AlbumId = album.Id,
            TrackId = track.Id,
            JobId = jobId,
        };
    }

    public async Task<YouTubeImportJobStatus> GetImportJobStatusAsync(
        Guid jobId,
        CancellationToken cancellationToken = default
    )
    {
        WorkerJob job =
            await _dbContext
                .WorkerJobs.AsNoTracking()
                .FirstOrDefaultAsync(
                    job => job.Id == jobId && job.Type == WorkerType.YouTubeCoverImport,
                    cancellationToken
                ) ?? throw new EntityNotFoundException($"Import job {jobId} not found.");

        return new YouTubeImportJobStatus
        {
            JobId = job.Id,
            Status = job.Status,
            ErrorMessage = job.ErrorMessage,
        };
    }

    public async Task RetryImportJobAsync(Guid jobId, CancellationToken cancellationToken = default)
    {
        await GetImportJobStatusAsync(jobId, cancellationToken);
        await _backgroundTaskQueue.RetryWorkerAsync(jobId, cancellationToken);
    }

    public static bool IsYouTubeThumbnailUrl(string url)
    {
        return Uri.TryCreate(url, UriKind.Absolute, out Uri? uri)
            && uri.Scheme == Uri.UriSchemeHttps
            && (
                uri.Host.Equals("ytimg.com", StringComparison.OrdinalIgnoreCase)
                || uri.Host.EndsWith(".ytimg.com", StringComparison.OrdinalIgnoreCase)
            );
    }

    private static Uri NormalizeVideoUrl(string url)
    {
        string trimmed = url.Trim();

        if (!trimmed.Contains("://", StringComparison.Ordinal))
            trimmed = $"https://{trimmed}";

        if (
            !Uri.TryCreate(trimmed, UriKind.Absolute, out Uri? uri)
            || (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp)
            || !YouTubeHosts.Contains(uri.Host)
        )
            throw new ValidationException("A valid YouTube video URL is required.");

        return uri;
    }

    private async Task<(YouTubeVideoInfo Info, IReadOnlyList<string> Thumbnails)> FetchVideoInfoAsync(
        string url,
        CancellationToken cancellationToken
    )
    {
        Uri videoUri = NormalizeVideoUrl(url);

        (bool success, string stdout) = await ExternalRunner.RunWithOutputAsync(
            _logger,
            _externalOptions.YtDlpPath,
            [
                "--dump-single-json",
                "--no-playlist",
                "--no-warnings",
                "--skip-download",
                "--",
                videoUri.AbsoluteUri,
            ],
            videoUri.AbsoluteUri,
            "stdout",
            "yt-dlp",
            cancellationToken
        );

        if (!success || string.IsNullOrWhiteSpace(stdout))
            throw new ValidationException("Unable to load the YouTube video information.");

        using JsonDocument document = JsonDocument.Parse(stdout);
        JsonElement root = document.RootElement;

        string? videoId = GetString(root, "id");
        string? webpageUrl = GetString(root, "webpage_url");

        if (videoId is null || webpageUrl is null)
            throw new ValidationException("The URL does not point to a YouTube video.");

        if (GetString(root, "_type") is string type && type != "video")
            throw new ValidationException("Playlists are not supported, use a single video URL.");

        YouTubeVideoInfo info = new()
        {
            VideoId = videoId,
            Title = GetString(root, "title") ?? videoId,
            WebpageUrl = webpageUrl,
            Channel = GetString(root, "channel") ?? GetString(root, "uploader") ?? string.Empty,
            ChannelId = GetString(root, "channel_id"),
            ChannelHandle = GetString(root, "uploader_id") is { } handle && handle.StartsWith('@')
                ? handle
                : null,
            DurationInMs =
                root.TryGetProperty("duration", out JsonElement duration)
                && duration.TryGetDouble(out double seconds)
                    ? (int)Math.Round(seconds * 1000)
                    : 0,
            UploadDate = ParseUploadDate(GetString(root, "upload_date")),
            ThumbnailUrl = GetString(root, "thumbnail"),
        };

        return (info, GetThumbnailCandidates(root, info.ThumbnailUrl));
    }

    private async Task<IReadOnlyList<YouTubePartySuggestion>> FindPartySuggestionsAsync(
        YouTubeVideoInfo info,
        CancellationToken cancellationToken
    )
    {
        List<int> linkedPartyIds = await FindChannelLinkedPartyIdsAsync(info, cancellationToken);

        List<YouTubePartySuggestion> suggestions = await _dbContext
            .Parties.AsNoTracking()
            .Where(party => linkedPartyIds.Contains(party.Id))
            .OrderBy(party => party.Name)
            .Select(party => new YouTubePartySuggestion
            {
                PartyId = party.Id,
                Name = party.Name,
                MatchedBy = YouTubePartyMatch.ChannelLink,
            })
            .ToListAsync(cancellationToken);

        // A saved link is explicit, the channel name is only a guess
        if (suggestions.Count > 0)
            return suggestions;

        List<string> names = GetChannelNameCandidates(info);

        if (names.Count == 0)
            return [];

        return await _dbContext
            .Parties.AsNoTracking()
            .Where(party =>
                party.Id != UnknownPartyId
                && (
                    names.Contains(party.NormalizedName)
                    || party.Aliases.Any(alias =>
                        alias.DeletedAt == null && names.Contains(alias.NormalizedName)
                    )
                )
            )
            .OrderBy(party => party.Name)
            .Take(MaxPartySuggestions)
            .Select(party => new YouTubePartySuggestion
            {
                PartyId = party.Id,
                Name = party.Name,
                MatchedBy = YouTubePartyMatch.Name,
            })
            .ToListAsync(cancellationToken);
    }

    private async Task<List<int>> FindChannelLinkedPartyIdsAsync(
        YouTubeVideoInfo info,
        CancellationToken cancellationToken
    )
    {
        HashSet<string> channelKeys = new(
            new[] { info.ChannelId, info.ChannelHandle }.OfType<string>(),
            StringComparer.OrdinalIgnoreCase
        );

        if (channelKeys.Count == 0)
            return [];

        // External ids are stored as channel ids, handles or full URLs, so compare them parsed
        var links = await _dbContext
            .PartyExternalInfos.AsNoTracking()
            .Where(externalInfo =>
                externalInfo.Type == PartyExternalInfoType.YouTube
                || externalInfo.Type == PartyExternalInfoType.YouTubeMusic
            )
            .Select(externalInfo => new { externalInfo.PartyId, externalInfo.ExternalId })
            .ToListAsync(cancellationToken);

        return links
            .Where(link => ToChannelKey(link.ExternalId) is { } key && channelKeys.Contains(key))
            .Select(link => link.PartyId)
            .Distinct()
            .Take(MaxPartySuggestions)
            .ToList();
    }

    private async Task<PartyExternalInfo?> CreateChannelLinkAsync(
        YouTubeVideoInfo info,
        int? partyId,
        string userId,
        CancellationToken cancellationToken
    )
    {
        string? channelKey = info.ChannelId ?? info.ChannelHandle;

        if (partyId is not int linkPartyId || channelKey is null)
            return null;

        List<int> linkedPartyIds = await FindChannelLinkedPartyIdsAsync(info, cancellationToken);

        if (linkedPartyIds.Contains(linkPartyId))
            return null;

        return new PartyExternalInfo
        {
            PartyId = linkPartyId,
            Type = PartyExternalInfoType.YouTube,
            ExternalId = channelKey,
            AddedByUserId = userId,
            SourceType = PartyDataSource.UserCreated,
        };
    }

    private static string? ToChannelKey(string externalId)
    {
        string value = externalId.Trim();

        if (!value.Contains("://", StringComparison.Ordinal))
            return value.Length > 0 ? value : null;

        if (!Uri.TryCreate(value, UriKind.Absolute, out Uri? uri) || !YouTubeHosts.Contains(uri.Host))
            return null;

        string[] segments = uri
            .AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries)
            .Select(Uri.UnescapeDataString)
            .ToArray();

        return segments switch
        {
            [{ } handle, ..] when handle.StartsWith('@') => handle,
            ["channel", { } channelId, ..] => channelId,
            _ => null,
        };
    }

    // "幸祜 / Kogo Official Channel" -> 幸祜, Kogo; "幸祜 - KOKO -" -> 幸祜, KOKO
    private static List<string> GetChannelNameCandidates(YouTubeVideoInfo info)
    {
        IEnumerable<string> rawNames = new[] { info.Channel, info.ChannelHandle?.TrimStart('@') }
            .OfType<string>()
            .SelectMany(name => ChannelNameSeparator().Split(name).Prepend(name));

        return rawNames
            .SelectMany(name => new[] { name, StripChannelSuffixes(name) })
            .Select(StringUtils.NormalizeString)
            .Where(name => name.Length > 0)
            .Distinct()
            .ToList();
    }

    private static string StripChannelSuffixes(string name)
    {
        string stripped = name.Trim();
        string previous;

        do
        {
            previous = stripped;
            stripped = ChannelNameSuffix().Replace(stripped, string.Empty).Trim();
        } while (stripped != previous && stripped.Length > 0);

        return stripped.Length > 0 ? stripped : name;
    }

    // A dash only separates when spaced, "Mrs. GREEN-APPLE" stays whole.
    // A space between CJK and Latin also does, "張敬軒 Hins Cheung" -> 張敬軒, Hins Cheung
    [GeneratedRegex(
        @"\s*[/／|｜]\s*|\s+[-–—~〜]\s*|\s*[-–—~〜]\s+|(?<=[\p{IsCJKUnifiedIdeographs}\p{IsHiragana}\p{IsKatakana}\p{IsHangulSyllables}])\s+(?=[A-Za-z])|(?<=[A-Za-z])\s+(?=[\p{IsCJKUnifiedIdeographs}\p{IsHiragana}\p{IsKatakana}\p{IsHangulSyllables}])"
    )]
    private static partial Regex ChannelNameSeparator();

    // Latin words need a separator so "Hitch" keeps its "ch"
    [GeneratedRegex(
        @"(?:[\s\-_.・]+(?:official|channel|ch\.?|music)|\s*(?:公式|チャンネル|ちゃんねる))$",
        RegexOptions.IgnoreCase
    )]
    private static partial Regex ChannelNameSuffix();

    // yt-dlp lists thumbnails it has not verified, maxres is missing on some videos
    private async Task<string?> FindAvailableThumbnailAsync(
        IReadOnlyList<string> candidates,
        CancellationToken cancellationToken
    )
    {
        HttpClient httpClient = _httpClientFactory.CreateClient();

        foreach (string candidate in candidates.Take(MaxThumbnailCandidates))
        {
            try
            {
                using HttpRequestMessage request = new(HttpMethod.Head, candidate);
                using HttpResponseMessage response = await httpClient.SendAsync(
                    request,
                    cancellationToken
                );

                if (response.IsSuccessStatusCode)
                    return candidate;
            }
            catch (HttpRequestException ex)
            {
                _logger.LogDebug(ex, "Thumbnail candidate {Url} is unavailable", candidate);
            }
        }

        return candidates.FirstOrDefault();
    }

    private static List<string> GetThumbnailCandidates(JsonElement root, string? fallback)
    {
        List<string> candidates = [];

        if (root.TryGetProperty("thumbnails", out JsonElement thumbnails))
        {
            candidates = thumbnails
                .EnumerateArray()
                .Select(thumbnail => new
                {
                    Url = GetString(thumbnail, "url"),
                    Preference = thumbnail.TryGetProperty("preference", out JsonElement value)
                        && value.TryGetInt32(out int preference)
                        ? preference
                        : int.MinValue,
                })
                .Where(thumbnail => thumbnail.Url is not null)
                .OrderByDescending(thumbnail => thumbnail.Preference)
                .Select(thumbnail => thumbnail.Url!)
                .ToList();
        }

        if (fallback is not null && !candidates.Contains(fallback))
            candidates.Add(fallback);

        return candidates.Where(IsYouTubeThumbnailUrl).ToList();
    }

    private static DateTimeOffset? ParseUploadDate(string? value)
    {
        return DateTimeOffset.TryParseExact(
            value,
            "yyyyMMdd",
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal,
            out DateTimeOffset date
        )
            ? date
            : null;
    }

    private static string? GetString(JsonElement element, string propertyName)
    {
        return
            element.TryGetProperty(propertyName, out JsonElement value)
            && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
    }
}
