using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;
using Music.Core.Common.Enums;
using Music.Core.Common.Exceptions;
using Music.Core.Common.Utils;
using Music.Core.Entities;
using Music.Core.Options;
using Music.Core.Services.Albums;
using Music.Core.Services.Albums.Enums;
using Music.Core.Services.Albums.Requests;
using Music.Core.Services.Albums.Results;
using Music.Core.Services.Files;
using Music.Core.Services.Files.Enums;
using Music.Core.Services.Files.Requests;
using Music.Core.Storage;
using Music.Infrastructure.Data;
using Music.Infrastructure.Mappers;

namespace Music.Infrastructure.Services.Album;

public class AlbumService(
    AppDbContext dbContext,
    IContentService contentService,
    IAssetsService assetsService,
    ILogger<AlbumService> logger
) : IAlbumService
{
    private readonly AppDbContext _dbContext = dbContext;
    private readonly IContentService _contentService = contentService;
    private readonly IAssetsService _assetsService = assetsService;
    private readonly ILogger<AlbumService> _logger = logger;

    public async Task<IReadOnlyList<AlbumListItem>> GetAllForListAsync(
        AlbumListRequest request,
        CancellationToken cancellationToken = default
    )
    {
        IQueryable<Core.Entities.Album> query = _dbContext.Albums.AsNoTracking();

        string normalizedSearch = StringUtils.NormalizeString(request.Search ?? string.Empty);
        string searchPattern = $"%{normalizedSearch}%";
        bool hasSearch = normalizedSearch.Length > 0;

        if (request.Types?.Count > 0)
        {
            query = query.Where(album => request.Types.Contains(album.Type));
        }

        if (request.LanguageIds?.Count > 0)
        {
            query = query.Where(album =>
                album.LanguageId.HasValue && request.LanguageIds.Contains(album.LanguageId.Value)
            );
        }

        if (request.PartyIds?.Count > 0)
        {
            query = query.Where(album =>
                album.Credits.Any(credit => request.PartyIds.Contains(credit.PartyId))
                || (
                    request.IsIncludeInTrackCredit
                    && album.Discs.Any(disc =>
                        disc.Tracks.Any(albumTrack =>
                            albumTrack.Track != null
                            && albumTrack.Track.Credits.Any(credit =>
                                request.PartyIds.Contains(credit.PartyId)
                            )
                        )
                    )
                )
            );
        }

        if (hasSearch)
        {
            query = query.Where(album =>
                EF.Functions.Like(
                    AppDbContext.ImmutableUnaccent(album.NormalizedTitle),
                    AppDbContext.ImmutableUnaccent(searchPattern)
                )
                || EF.Functions.TrigramsAreSimilar(
                    AppDbContext.ImmutableUnaccent(album.NormalizedTitle),
                    AppDbContext.ImmutableUnaccent(normalizedSearch)
                )
                || album.Discs.Any(disc =>
                    disc.Tracks.Any(albumTrack =>
                        albumTrack.Track != null
                        && (
                            EF.Functions.Like(
                                AppDbContext.ImmutableUnaccent(albumTrack.Track.NormalizedTitle),
                                AppDbContext.ImmutableUnaccent(searchPattern)
                            )
                            || EF.Functions.TrigramsAreSimilar(
                                AppDbContext.ImmutableUnaccent(albumTrack.Track.NormalizedTitle),
                                AppDbContext.ImmutableUnaccent(normalizedSearch)
                            )
                            || (
                                albumTrack.Track.BasedOnTrack != null
                                && (
                                    EF.Functions.Like(
                                        AppDbContext.ImmutableUnaccent(
                                            albumTrack.Track.BasedOnTrack.NormalizedTitle
                                        ),
                                        AppDbContext.ImmutableUnaccent(searchPattern)
                                    )
                                    || EF.Functions.TrigramsAreSimilar(
                                        AppDbContext.ImmutableUnaccent(
                                            albumTrack.Track.BasedOnTrack.NormalizedTitle
                                        ),
                                        AppDbContext.ImmutableUnaccent(normalizedSearch)
                                    )
                                )
                            )
                        )
                    )
                )
            );
        }

        query = request.Sort switch
        {
            ListSortOption.TitleDesc => query.OrderByDescending(album => album.Title),
            ListSortOption.CreatedAtDesc => query.OrderByDescending(album => album.CreatedAt),
            ListSortOption.CreatedAtAsc => query.OrderBy(album => album.CreatedAt),
            _ => query.OrderBy(album => album.Title),
        };

        if (request.Limit > 0)
        {
            query = query.Take(request.Limit);
        }

        List<Core.Entities.Album> albums = await query
            .AsSplitQuery()
            .Include(a => a.Credits)
                .ThenInclude(c => c.Party)
            .Include(a => a.Discs)
                .ThenInclude(d => d.Tracks)
                    .ThenInclude(at => at.Track)
                        .ThenInclude(track => track!.BasedOnTrack)
            .Include(a => a.Images)
                .ThenInclude(i => i.File)
                    .ThenInclude(f => f!.FileObjects)
            .ToListAsync(cancellationToken);

        Dictionary<int, HashSet<int>> matchedTrackIdsByAlbumId = [];

        if (hasSearch && albums.Count > 0)
        {
            int[] albumIds = albums.Select(album => album.Id).ToArray();

            var matchedTracks = await _dbContext
                .AlbumTracks.AsNoTracking()
                .Where(albumTrack =>
                    albumTrack.AlbumDisc != null
                    && albumTrack.Track != null
                    && albumIds.Contains(albumTrack.AlbumDisc.AlbumId)
                    && (
                        EF.Functions.Like(
                            AppDbContext.ImmutableUnaccent(albumTrack.Track.NormalizedTitle),
                            AppDbContext.ImmutableUnaccent(searchPattern)
                        )
                        || EF.Functions.TrigramsAreSimilar(
                            AppDbContext.ImmutableUnaccent(albumTrack.Track.NormalizedTitle),
                            AppDbContext.ImmutableUnaccent(normalizedSearch)
                        )
                        || (
                            albumTrack.Track.BasedOnTrack != null
                            && (
                                EF.Functions.Like(
                                    AppDbContext.ImmutableUnaccent(
                                        albumTrack.Track.BasedOnTrack.NormalizedTitle
                                    ),
                                    AppDbContext.ImmutableUnaccent(searchPattern)
                                )
                                || EF.Functions.TrigramsAreSimilar(
                                    AppDbContext.ImmutableUnaccent(
                                        albumTrack.Track.BasedOnTrack.NormalizedTitle
                                    ),
                                    AppDbContext.ImmutableUnaccent(normalizedSearch)
                                )
                            )
                        )
                    )
                )
                .Select(albumTrack => new { albumTrack.AlbumDisc!.AlbumId, albumTrack.TrackId })
                .ToListAsync(cancellationToken);

            matchedTrackIdsByAlbumId = matchedTracks
                .GroupBy(track => track.AlbumId)
                .ToDictionary(
                    group => group.Key,
                    group => group.Select(track => track.TrackId).ToHashSet()
                );
        }

        return albums
            .Select(album =>
                album.ToListItem(
                    _assetsService,
                    matchedTrackIdsByAlbumId.GetValueOrDefault(album.Id)
                )
            )
            .ToList();
    }

    public async Task<AlbumDetails> GetByIdAsync(
        int albumId,
        CancellationToken cancellationToken = default
    )
    {
        Core.Entities.Album? album = await _dbContext
            .Albums.AsNoTracking()
            .AsSplitQuery()
            .Include(a => a.Credits)
                .ThenInclude(c => c.Party)
                    .ThenInclude(party => party!.Images)
                        .ThenInclude(image => image.File)
                            .ThenInclude(file => file!.FileObjects)
            .Include(a => a.Discs)
                .ThenInclude(d => d.Tracks)
                    .ThenInclude(at => at.Track!)
                        .ThenInclude(t => t.Credits)
                            .ThenInclude(tc => tc.Party)
                                .ThenInclude(p => p!.Images)
                                    .ThenInclude(image => image.File)
                                        .ThenInclude(file => file!.FileObjects)
            .Include(a => a.Discs)
                .ThenInclude(d => d.Tracks)
                    .ThenInclude(at => at.Track!)
                        .ThenInclude(t => t.Audios)
                            .ThenInclude(s => s.File!)
                                .ThenInclude(f => f.FileObjects)
            .Include(a => a.Images)
                .ThenInclude(i => i.File)
                    .ThenInclude(f => f!.FileObjects)
            .FirstOrDefaultAsync(a => a.Id == albumId, cancellationToken);

        if (album is null)
            throw new EntityNotFoundException($"Album {albumId} not found");

        List<AlbumDiscDetails> discs = album
            .Discs.OrderBy(d => d.DiscNumber)
            .Select(d => new AlbumDiscDetails
            {
                AlbumDiscId = d.Id,
                DiscNumber = d.DiscNumber,
                Subtitle = d.Subtitle,
                Tracks = d
                    .Tracks.OrderBy(at => at.TrackNumber)
                    .Select(at =>
                    {
                        Track track = at.Track!;

                        List<TrackAudioDetails> audios = track
                            .Audios.OrderByDescending(a => a.Pinned)
                            .ThenBy(a => a.Rank)
                            .Select(a => new TrackAudioDetails
                            {
                                Rank = a.Rank,
                                Pinned = a.Pinned,
                                Source = a.File!.Source,
                                SourceUrl = a.File.SourceUrl,
                                File = BuildTrackSourceFiles(a.File),
                            })
                            .ToList();

                        return new AlbumTrackDetails
                        {
                            TrackId = track.Id,
                            TrackNumber = at.TrackNumber,
                            Title = track.Title,
                            DurationInMs = track.DurationInMs,
                            VersionType = track.VersionType,
                            ContentType = track.ContentType,
                            BasedOnTrackId = track.BasedOnTrackId,
                            Credits = track
                                .Credits.Where(c => c.Party is not null)
                                .OrderBy(c => c.Party!.Name)
                                .Select(c => new TrackPartyCredit
                                {
                                    PartyId = c.PartyId,
                                    Name = c.Party!.Name,
                                    Type = c.Party!.Type,
                                    CreditType = c.Credit,
                                    Avatar = c.Party.ToPrimaryAvatarImages(_assetsService),
                                })
                                .ToList(),
                            Audios = audios,
                        };
                    })
                    .ToList(),
            })
            .ToList();

        int totalTrackCount = discs.Sum(d => d.Tracks.Count);
        int totalDurationInMs = discs.SelectMany(d => d.Tracks).Sum(t => t.DurationInMs);

        return new AlbumDetails
        {
            AlbumId = album.Id,
            Title = album.Title,
            Type = album.Type,
            Cover = album.ToAlbumCoverDetails(_assetsService),
            ReleaseDate = album.ReleaseDate,
            TotalTrackCount = totalTrackCount,
            TotalDurationInMs = totalDurationInMs,
            Credits = album
                .Credits.Select(c => new AlbumPartyCredit
                {
                    PartyId = c.PartyId,
                    Name = c.Party!.Name,
                    Type = c.Party!.Type,
                    CreditType = c.Credit,
                    Avatar = c.Party.ToPrimaryAvatarImages(_assetsService),
                })
                .ToList(),
            Discs = discs,
        };
    }

    private TrackAudioFileVariants BuildTrackSourceFiles(StoredFile? storedFile)
    {
        if (storedFile?.FileObjects is null)
            throw new InvalidOperationException("Track source file is missing file objects");

        FileObject? original = storedFile.FileObjects.FirstOrDefault(fo =>
            fo.FileObjectVariant == FileObjectVariant.Original
        );

        if (original is null)
            throw new InvalidOperationException(
                "Track source file is missing Original file object variant"
            );

        FileObject? opus96 = storedFile.FileObjects.FirstOrDefault(fo =>
            fo.FileObjectVariant == FileObjectVariant.Opus96
        );

        FileObject? taggedOriginal = storedFile.FileObjects.FirstOrDefault(fo =>
            fo.FileObjectVariant == FileObjectVariant.TaggedOriginal
        );

        FileObject? waveformB8Pixel20 = storedFile.FileObjects.FirstOrDefault(fo =>
            fo.FileObjectVariant == FileObjectVariant.WaveformB8Pixel20
        );

        return new TrackAudioFileVariants
        {
            Original = original.ToContentDetails(_contentService),
            TaggedOriginal = taggedOriginal?.ToContentDetails(_contentService),
            Opus96 = opus96?.ToContentDetails(_contentService),
            WaveformB8Pixel20 = waveformB8Pixel20?.ToAssetDetails(_assetsService),
        };
    }

    public async Task<AlbumSummary> GetSummaryByIdAsync(
        int albumId,
        CancellationToken cancellationToken = default
    )
    {
        Core.Entities.Album? album = await _dbContext
            .Albums.AsNoTracking()
            .AsSplitQuery()
            .Include(a => a.Credits)
                .ThenInclude(c => c.Party)
            .Include(a => a.Images)
                .ThenInclude(i => i.File)
                    .ThenInclude(f => f!.FileObjects)
            .Include(a => a.Discs)
                .ThenInclude(d => d.Tracks)
                    .ThenInclude(t => t.Track)
            .FirstOrDefaultAsync(a => a.Id == albumId, cancellationToken);

        if (album is null)
            throw new EntityNotFoundException($"Album {albumId} not found");

        AlbumCoverDetails coverDetails = album.ToAlbumCoverDetails(_assetsService);
        ImageFileVariants coverVariants = coverDetails.Album;

        return new AlbumSummary
        {
            Title = album.Title,
            Credits = album
                .Credits.Where(c => c.Party is not null)
                .Select(c => c.Party!.Name)
                .Distinct()
                .OrderBy(name => name)
                .ToList(),
            CoverUrl =
                coverVariants.ImageCover1024x1024?.Url
                ?? coverVariants.Original?.Url
                ?? string.Empty,
            Discs = album
                .Discs.OrderBy(d => d.DiscNumber)
                .Select(d =>
                {
                    ImageFileVariants? discCoverVariants = coverDetails
                        .Discs.FirstOrDefault(cover => cover.AlbumDiscId == d.Id)
                        ?.Variants;

                    return new AlbumSummaryDisc
                    {
                        DiscNumber = d.DiscNumber,
                        CoverUrl =
                            discCoverVariants?.ImageCover1024x1024?.Url
                            ?? discCoverVariants?.Original?.Url
                            ?? string.Empty,
                        Tracks = d
                            .Tracks.Where(t => t.Track is not null)
                            .OrderBy(t => t.TrackNumber)
                            .Select(t => new AlbumSummaryTrack
                            {
                                TrackId = t.TrackId,
                                TrackNumber = t.TrackNumber,
                                Title = t.Track!.Title,
                                DurationInMs = t.Track.DurationInMs,
                            })
                            .ToList(),
                    };
                })
                .ToList(),
        };
    }

    private static string BuildDownloadFileName(
        int discNumber,
        int trackNumber,
        string trackTitle,
        string extension
    )
    {
        string fileName = $"{discNumber}-{trackNumber}-{trackTitle}.{extension}";
        char[] invalidFileNameChars = Path.GetInvalidFileNameChars();

        return string.Concat(fileName.Select(ch => invalidFileNameChars.Contains(ch) ? '_' : ch));
    }

    public async Task<IReadOnlyList<AlbumTrackDownloadItem>> GetAlbumDownloadUrlsAsync(
        int albumId,
        FileObjectVariant variant,
        CancellationToken cancellationToken = default
    )
    {
        Core.Entities.Album? album = await _dbContext
            .Albums.AsNoTracking()
            .AsSplitQuery()
            .Include(a => a.Discs)
                .ThenInclude(d => d.Tracks)
                    .ThenInclude(at => at.Track!)
                        .ThenInclude(t => t.Audios)
                            .ThenInclude(s => s.File!)
                                .ThenInclude(f => f.FileObjects)
            .FirstOrDefaultAsync(a => a.Id == albumId, cancellationToken);

        if (album is null)
            throw new EntityNotFoundException($"Album {albumId} not found");

        List<AlbumTrackDownloadItem> downloads = [];

        IEnumerable<AlbumDisc> orderedDiscs = album.Discs.OrderBy(d => d.DiscNumber);

        foreach (AlbumDisc disc in orderedDiscs)
        {
            IEnumerable<AlbumTrack> orderedTracks = disc.Tracks.OrderBy(t => t.TrackNumber);

            foreach (AlbumTrack albumTrack in orderedTracks)
            {
                AlbumTrackDownloadItem? item = GetTrackDownloadItemFromAlbumTrack(
                    albumTrack,
                    variant,
                    cancellationToken
                );

                if (item is null)
                    continue;

                downloads.Add(item);
            }
        }

        return downloads;
    }

    //TODO: possible using a ID here
    private AlbumTrackDownloadItem? GetTrackDownloadItemFromAlbumTrack(
        AlbumTrack albumTrack,
        FileObjectVariant variant,
        CancellationToken cancellationToken
    )
    {
        Track? track = albumTrack.Track;

        if (track is null)
            return null;

        TrackAudio? audio = track.Audios.FirstOrDefault(a =>
            a.File != null && a.File.FileObjects.Any(fo => fo.FileObjectVariant == variant)
        );

        if (audio?.File?.FileObjects is null)
            return null;

        FileObject? fileObject = audio.File.FileObjects.FirstOrDefault(fo =>
            fo.FileObjectVariant == variant
        );

        if (fileObject is null)
            return null;

        string fileName = BuildDownloadFileName(
            albumTrack.AlbumDisc!.DiscNumber,
            albumTrack.TrackNumber,
            track.Title,
            fileObject.Extension
        );

        return new AlbumTrackDownloadItem
        {
            TrackId = track.Id,
            DiscNumber = albumTrack.AlbumDisc.DiscNumber,
            TrackNumber = albumTrack.TrackNumber,
            TrackTitle = track.Title,
            Url = _contentService.GetPresignedUrl(
                fileObject.StoragePath,
                DateTime.UtcNow.AddHours(10),
                fileName,
                cancellationToken
            ),
            FileName = fileName,
            Variant = variant,
        };
    }

    public async Task<AlbumTrackDownloadItem> GetTrackDownloadUrlAsync(
        int trackId,
        FileObjectVariant variant,
        CancellationToken cancellationToken = default
    )
    {
        AlbumTrack? albumTrack = await _dbContext
            .AlbumTracks.AsNoTracking()
            .AsSplitQuery()
            .Where(at => at.TrackId == trackId)
            .OrderBy(at => at.AlbumDisc!.AlbumId)
            .ThenBy(at => at.AlbumDisc!.DiscNumber)
            .ThenBy(at => at.TrackNumber)
            .Include(at => at.AlbumDisc)
            .Include(at => at.Track!)
                .ThenInclude(t => t.Audios)
                    .ThenInclude(a => a.File!)
                        .ThenInclude(f => f.FileObjects)
            .FirstOrDefaultAsync(cancellationToken);

        if (albumTrack?.Track is null || albumTrack.AlbumDisc is null)
            throw new EntityNotFoundException($"Track {trackId} not found");

        AlbumTrackDownloadItem? item = GetTrackDownloadItemFromAlbumTrack(
            albumTrack,
            variant,
            cancellationToken
        );

        return item
            ?? throw new EntityNotFoundException(
                $"Track {trackId} does not have the requested audio variant"
            );
    }

    public async Task<IReadOnlyList<CreateAlbumResult>> CreateAlbumAsync(
        IReadOnlyList<CreateAlbumRequest> albums,
        string userId,
        CancellationToken cancellationToken = default
    )
    {
        if (albums.Count == 0)
            return [];

        List<CreateAlbumResult> results = new(albums.Count);
        foreach (CreateAlbumRequest album in albums)
        {
            //TODO: add a overwrite check here.
            if (await AlbumExistsAsync(album, cancellationToken))
            {
                results.Add(
                    CreateAlbumResult.Failure(
                        album.ClientTempAlbumId,
                        album.Title,
                        "Album already exists with the same title and artists"
                    )
                );
                continue;
            }

            await using IDbContextTransaction transaction =
                await _dbContext.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                CreateAlbumUploadResult uploadResults = await CreateSingleAlbum(
                    album,
                    userId,
                    cancellationToken
                );
                await _dbContext.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                results.Add(
                    CreateAlbumResult.Success(album.ClientTempAlbumId, album.Title, uploadResults)
                );
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                await transaction.RollbackAsync(CancellationToken.None);
                _dbContext.ChangeTracker.Clear();
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating album {AlbumTitle}", album.Title);
                await transaction.RollbackAsync(CancellationToken.None);
                _dbContext.ChangeTracker.Clear();
                results.Add(
                    CreateAlbumResult.Failure(
                        album.ClientTempAlbumId,
                        album.Title,
                        "Failed to create this album"
                    )
                );
            }
        }

        return results;
    }

    private async Task<CreateAlbumUploadResult> CreateSingleAlbum(
        CreateAlbumRequest album,
        string userId,
        CancellationToken cancellationToken
    )
    {
        Core.Entities.Album newAlbum = new Core.Entities.Album
        {
            Title = album.Title,
            Description = album.Description,
            Type = album.Type,
            LanguageId = album.LanguageId == 0 ? null : album.LanguageId,
            CreatedByUserId = userId,
            ReleaseDate = album.ReleaseDate,
        };

        _dbContext.Albums.Add(newAlbum);

        List<AlbumCredit> albumCredits = album
            .Credits.DistinctBy(ac => (ac.PartyId, ac.Credit))
            .Select(ac => new AlbumCredit
            {
                Album = newAlbum,
                PartyId = ac.PartyId,
                Credit = ac.Credit,
            })
            .ToList();

        if (albumCredits.Count == 0)
        {
            albumCredits.Add(
                new AlbumCredit
                {
                    Album = newAlbum,
                    PartyId = 1,
                    Credit = CreditType.Artist,
                }
            );
        }

        _dbContext.AlbumCredits.AddRange(albumCredits);

        CreateAlbumUploadResult uploadResults = new() { AlbumTitle = album.Title };
        AlbumImage? albumImage = null;

        if (album.Image is not null)
        {
            (albumImage, CreateAlbumImageUploadItemResult imageUpload) = await CreateAlbumImage(
                album.Image,
                newAlbum,
                userId,
                cancellationToken
            );
            uploadResults.Images.Add(imageUpload);
        }

        foreach (AlbumDiscRequest albumDisc in album.Discs)
        {
            (
                CreateAlbumImageUploadItemResult? discImage,
                List<CreateAlbumTrackUploadItemResult> tracks
            ) = await CreateDisc(albumDisc, newAlbum, userId, cancellationToken, albumImage);

            if (discImage is not null)
                uploadResults.Images.Add(discImage);

            uploadResults.Tracks.AddRange(tracks);
        }

        return uploadResults;
    }

    private static bool IsSameImage(AlbumImageRequest imageModel, AlbumImage albumImage)
    {
        return albumImage.File?.OriginalBlake3Hash == imageModel.File.Blake3Hash;
    }

    private async Task<(
        CreateAlbumImageUploadItemResult? Image,
        List<CreateAlbumTrackUploadItemResult> Tracks
    )> CreateDisc(
        AlbumDiscRequest albumDisc,
        Core.Entities.Album album,
        string userId,
        CancellationToken cancellationToken,
        AlbumImage? albumImage
    )
    {
        AlbumDisc newAlbumDisc = new()
        {
            Album = album,
            DiscNumber = albumDisc.DiscNumber,
            Subtitle = albumDisc.Subtitle,
        };

        _dbContext.AlbumDiscs.Add(newAlbumDisc);

        CreateAlbumImageUploadItemResult? imageUpload = null;

        if (albumDisc.Image is not null)
        {
            if (albumImage is not null && IsSameImage(albumDisc.Image, albumImage))
            {
                CreateDiscImageFromAlbumImage(album, newAlbumDisc, albumImage);
            }
            else
            {
                (_, imageUpload) = await CreateAlbumImage(
                    albumDisc.Image,
                    album,
                    userId,
                    cancellationToken,
                    newAlbumDisc
                );
            }
        }

        List<CreateAlbumTrackUploadItemResult> sourceResults = [];

        foreach (AlbumTrackRequest albumTrack in albumDisc.Tracks)
        {
            sourceResults.AddRange(
                await CreateTrack(albumTrack, newAlbumDisc, userId, cancellationToken)
            );
        }

        return (imageUpload, sourceResults);
    }

    private async Task<List<CreateAlbumTrackUploadItemResult>> CreateTrack(
        AlbumTrackRequest albumTrack,
        AlbumDisc albumDisc,
        string userId,
        CancellationToken cancellationToken
    )
    {
        //TODO: handle current new track to link the BasedOnTrackId(now i ignore and the UI handle it by only show the existings track list)
        // OR just not support it.
        Track track = new()
        {
            Title = albumTrack.Title,
            Description = albumTrack.Description,
            DurationInMs = albumTrack.DurationInMs,
            LanguageId = albumTrack.LanguageId == 0 ? null : albumTrack.LanguageId,
            ContentType = albumTrack.ContentType,
            VersionType = albumTrack.VersionType,
            BasedOnTrackId = albumTrack.BasedOnTrackId,
            CreatedByUserId = userId,
        };

        _dbContext.Tracks.Add(track);

        AlbumTrack newAlbumTrack = new()
        {
            AlbumDisc = albumDisc,
            Track = track,
            TrackNumber = albumTrack.TrackNumber,
        };

        _dbContext.AlbumTracks.Add(newAlbumTrack);

        IEnumerable<TrackCredit> trackCredits = albumTrack.Credits.Select(tc => new TrackCredit
        {
            Track = track,
            PartyId = tc.PartyId,
            Credit = tc.Credit,
        });

        _dbContext.TrackCredits.AddRange(trackCredits);

        List<CreateAlbumTrackUploadItemResult> sourceResults = [];

        foreach (TrackAudioRequest trackVariant in albumTrack.Audios)
        {
            sourceResults.Add(
                await CreateTrackAudio(trackVariant, track, userId, cancellationToken)
            );
        }

        return sourceResults;
    }

    private async Task<CreateAlbumTrackUploadItemResult> CreateTrackAudio(
        TrackAudioRequest trackAudio,
        Track track,
        string userId,
        CancellationToken cancellationToken
    )
    {
        string path = _contentService.GetStoragePath(
            MediaFolderOptions.OriginalMusic,
            trackAudio.File.Blake3Hash,
            trackAudio.File.MimeType
        );

        (StoredFile? storedFile, FileObject? fileObject) =
            _contentService.CreateStoredFileWithObject(
                trackAudio.File,
                FileType.Audio,
                path,
                StorageArea.Content,
                FileObjectVariant.Original,
                userId,
                trackAudio.Source,
                trackAudio.SourceUrl
            );

        _dbContext.StoredFiles.Add(storedFile);
        _dbContext.FileObjects.Add(fileObject);

        TrackAudio newTrackAudio = new()
        {
            Track = track,
            Rank = trackAudio.Rank,
            Pinned = trackAudio.Pinned,
            File = storedFile,
            UploadedByUserId = userId,
        };

        _dbContext.TrackAudios.Add(newTrackAudio);

        return new CreateAlbumTrackUploadItemResult
        {
            FileObjectId = fileObject.Id,
            Blake3Hash = trackAudio.File.Blake3Hash,
            FileName = trackAudio.File.OriginalFileName,
            MultipartUploadInfo = await _contentService.CreateMultipartUploadAsync(
                path,
                fileObject.MimeType,
                fileObject.SizeInBytes,
                cancellationToken
            ),
        };
    }

    private async Task<(
        AlbumImage Image,
        CreateAlbumImageUploadItemResult Upload
    )> CreateAlbumImage(
        AlbumImageRequest imageModel,
        Core.Entities.Album album,
        string userId,
        CancellationToken cancellationToken,
        AlbumDisc? albumDisc = null
    )
    {
        string imagePath = _assetsService.GetStoragePath(
            MediaFolderOptions.AssetsCover,
            imageModel.File.Blake3Hash,
            imageModel.File.MimeType
        );

        (StoredFile? storedFile, FileObject? fileObject) =
            _assetsService.CreateStoredFileWithObject(
                imageModel.File,
                FileType.Image,
                imagePath,
                StorageArea.Assets,
                FileObjectVariant.Original,
                userId
            );

        _dbContext.StoredFiles.Add(storedFile);
        _dbContext.FileObjects.Add(fileObject);

        AlbumImage albumImage = new()
        {
            Album = album,
            AlbumDisc = albumDisc,
            File = storedFile,
            IsPrimary = true,
            CropHeight = imageModel.CroppedArea?.Height,
            CropWidth = imageModel.CroppedArea?.Width,
            CropX = imageModel.CroppedArea?.X,
            CropY = imageModel.CroppedArea?.Y,
        };

        _dbContext.AlbumImages.Add(albumImage);

        CreateAlbumImageUploadItemResult upload = new()
        {
            ClientReferenceId = imageModel.ClientReferenceId,
            DiscNumber = albumDisc?.DiscNumber,
            FileObjectId = fileObject.Id,
            Blake3Hash = imageModel.File.Blake3Hash,
            FileName = imageModel.File.OriginalFileName,
            UploadUrl = _assetsService.CreateUploadUrlAsync(
                imagePath,
                fileObject.MimeType,
                cancellationToken
            ),
        };

        return (albumImage, upload);
    }

    private void CreateDiscImageFromAlbumImage(
        Core.Entities.Album album,
        AlbumDisc albumDisc,
        AlbumImage albumImage
    )
    {
        AlbumImage discImage = new()
        {
            Album = album,
            AlbumDisc = albumDisc,
            File = albumImage.File,
            IsPrimary = true,
            CropHeight = albumImage.CropHeight,
            CropWidth = albumImage.CropWidth,
            CropX = albumImage.CropX,
            CropY = albumImage.CropY,
        };

        _dbContext.AlbumImages.Add(discImage);
    }

    private async Task<bool> AlbumExistsAsync(
        CreateAlbumRequest album,
        CancellationToken cancellationToken
    )
    {
        string normalizedTitle = StringUtils.NormalizeString(album.Title);

        List<int> inputArtistIds = album
            .Credits.Where(c => c.Credit == CreditType.Artist)
            .Select(c => c.PartyId)
            .Distinct()
            .OrderBy(id => id)
            .ToList();

        // seeded unknown artist
        if (inputArtistIds.Count == 0)
            inputArtistIds.Add(1);

        List<Core.Entities.Album> matchingAlbums = await _dbContext
            .Albums.Where(a => a.NormalizedTitle == normalizedTitle)
            .Include(a => a.Credits)
            .ToListAsync(cancellationToken);

        foreach (var existingAlbum in matchingAlbums)
        {
            List<int> existingArtistIds = existingAlbum
                .Credits.Where(c => c.Credit == CreditType.Artist)
                .Select(c => c.PartyId)
                .Distinct()
                .OrderBy(id => id)
                .ToList();

            if (inputArtistIds.SequenceEqual(existingArtistIds))
                return true;
        }

        return false;
    }
}
