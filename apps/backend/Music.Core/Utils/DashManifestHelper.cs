using System.Xml.Linq;
using Music.Core.Models;
using Music.Core.Services.Interfaces;

namespace Music.Core.Utils;

public static class DashManifestHelper
{
    // Used to add the Label metadata into the .mpd file, because ffmpeg doesn't support adding it.
    // Shaka Packager can't produce the files i want that can ez inject presign url later.
    public static void InjectAudioLabelsIntoDashManifest(string manifestPath, MediaProbeResult probeResult)
    {
        List<ProbeStream> audioStreams = (probeResult.Streams ?? [])
            .Where(stream => string.Equals(stream.CodecType, "audio", StringComparison.OrdinalIgnoreCase))
            .OrderBy(stream => stream.Index)
            .ToList();

        if (audioStreams.Count == 0)
        {
            return;
        }

        XDocument document = XDocument.Load(manifestPath, LoadOptions.PreserveWhitespace);
        XElement root = document.Root ?? throw new InvalidOperationException("MPD root element not found.");
        XNamespace ns = root.Name.Namespace;

        List<XElement> audioAdaptationSets = root
            .Descendants(ns + "AdaptationSet")
            .Where(IsAudioAdaptationSet)
            .ToList();

        if (audioAdaptationSets.Count == 0 || audioAdaptationSets.Count != audioStreams.Count)
        {
            return;
        }

        for (int i = 0; i < audioStreams.Count; i++)
        {
            ApplyAudioStreamMetadata(audioAdaptationSets[i], audioStreams[i], ns);
        }

        document.Save(manifestPath, SaveOptions.DisableFormatting);
    }

    private static void ApplyAudioStreamMetadata(XElement element, ProbeStream audioStream, XNamespace ns)
    {
        string language = MediaFiles.GetLanguage(audioStream);
        string label = MediaFiles.BuildAudioTitle(audioStream);

        element.SetAttributeValue("lang", language);

        foreach (XElement existingLabel in element.Elements(ns + "Label").ToList())
        {
            existingLabel.Remove();
        }

        element.AddFirst(new XElement(ns + "Label", label));
    }

    private static bool IsAudioAdaptationSet(XElement adaptationSet)
    {
        string? contentType = adaptationSet.Attribute("contentType")?.Value;
        if (string.Equals(contentType, "audio", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        string? mimeType = adaptationSet.Attribute("mimeType")?.Value;
        return !string.IsNullOrWhiteSpace(mimeType)
            && mimeType.StartsWith("audio/", StringComparison.OrdinalIgnoreCase);
    }

    public static string InjectPresignUrl(string xml, string objectFolder, IContentService contentService, CancellationToken cancellationToken)
    {
        XDocument document = XDocument.Parse(xml, LoadOptions.PreserveWhitespace);
        XElement root = document.Root ?? throw new InvalidOperationException("MPD root element not found.");
        XNamespace ns = root.Name.Namespace;

        foreach (XElement baseUrl in root.Descendants(ns + "BaseURL").ToList())
        {
            baseUrl.Remove();
        }

        foreach (XElement init in root.Descendants(ns + "Initialization"))
        {
            cancellationToken.ThrowIfCancellationRequested();
            RewriteUrlAttribute(init, "sourceURL", objectFolder, contentService, cancellationToken);
        }

        foreach (XElement segmentUrl in root.Descendants(ns + "SegmentURL"))
        {
            cancellationToken.ThrowIfCancellationRequested();
            RewriteUrlAttribute(segmentUrl, "media", objectFolder, contentService, cancellationToken);
        }

        return document.Declaration is null
            ? document.ToString(SaveOptions.DisableFormatting)
            : document.Declaration + Environment.NewLine + document.ToString(SaveOptions.DisableFormatting);
    }

    private static void RewriteUrlAttribute(
        XElement element,
        string attributeName,
        string storagePath,
        IContentService contentService,
        CancellationToken cancellationToken)
    {
        XAttribute? attribute = element.Attribute(attributeName);
        if (attribute is null || string.IsNullOrWhiteSpace(attribute.Value) || IsAbsoluteUrl(attribute.Value))
        {
            return;
        }

        if (attribute.Value.Contains('$', StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                $"Manifest contains unresolved DASH template placeholder in attribute '{attributeName}'.");
        }

        attribute.Value = contentService.GetPresignedUrlAsync(
            CombineStoragePath(storagePath, attribute.Value),
            DateTime.UtcNow.AddHours(5),
            cancellationToken);
    }

    public static string CombineStoragePath(string left, string right)
    {
        string l = (left ?? string.Empty).TrimEnd('/');
        string r = (right ?? string.Empty).TrimStart('/');
        return $"{l}/{r}";
    }

    private static bool IsAbsoluteUrl(string value)
    {
        return Uri.TryCreate(value, UriKind.Absolute, out _);
    }
}
