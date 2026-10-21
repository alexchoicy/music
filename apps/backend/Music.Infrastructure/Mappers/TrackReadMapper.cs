using Music.Core.Entities;
using Music.Core.Services.Albums;
using Music.Core.Services.Files.Enums;
using Music.Core.Storage;

namespace Music.Infrastructure.Mappers;

internal static class TrackReadMapper
{
    public static List<TrackPartyCredit> ToPartyCredits(
        this Track track,
        IAssetsService assetsService
    ) =>
        track
            .Credits.Where(c => c.Party is not null)
            .OrderBy(c => c.Party!.Name)
            .Select(c => new TrackPartyCredit
            {
                PartyId = c.PartyId,
                Name = c.Party!.Name,
                Type = c.Party!.Type,
                CreditType = c.Credit,
                Avatar = c.Party.ToPrimaryAvatarImages(assetsService),
            })
            .ToList();

    public static List<TrackAudioDetails> ToAudioDetails(
        this Track track,
        IContentService contentService,
        IAssetsService assetsService
    ) =>
        track
            .Audios.OrderByDescending(a => a.Pinned)
            .ThenBy(a => a.Rank)
            .Select(a => new TrackAudioDetails
            {
                Rank = a.Rank,
                Pinned = a.Pinned,
                Source = a.File!.Source,
                SourceUrl = a.File.SourceUrl,
                File = a.File.ToAudioFileVariants(contentService, assetsService),
            })
            .ToList();

    private static TrackAudioFileVariants ToAudioFileVariants(
        this StoredFile? storedFile,
        IContentService contentService,
        IAssetsService assetsService
    )
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
            Original = original.ToContentDetails(contentService),
            TaggedOriginal = taggedOriginal?.ToContentDetails(contentService),
            Opus96 = opus96?.ToContentDetails(contentService),
            WaveformB8Pixel20 = waveformB8Pixel20?.ToAssetDetails(assetsService),
        };
    }
}
