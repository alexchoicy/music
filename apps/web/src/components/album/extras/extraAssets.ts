import type {
	ExtraAssetDetails,
	ExtraDetails,
} from "#/lib/queries/extra.queries";

export type ExtraCrop = {
	height: number;
	width: number;
	x: number;
	y: number;
};

export function getAssetName(asset: ExtraAssetDetails) {
	return asset.title || asset.originalFileName;
}

export function getAssetThumbnailUrl(asset: ExtraAssetDetails) {
	if (asset.fileType === "Video") return asset.thumbnail?.url;
	if (asset.fileType !== "Image") return undefined;
	return asset.thumbnail?.url ?? asset.preview?.url ?? asset.original?.url;
}

export function getAssetPreviewUrl(asset: ExtraAssetDetails) {
	if (asset.fileType !== "Image") return undefined;
	return asset.preview?.url ?? asset.original?.url;
}

export function getAssetContentUrl(asset: ExtraAssetDetails) {
	if (!asset.original) return undefined;
	return asset.fileType === "Image"
		? asset.original.url
		: `${asset.original.url}/play`;
}

export function isMediaAsset(asset: ExtraAssetDetails) {
	return asset.fileType === "Audio" || asset.fileType === "Video";
}

export function isMediaExtra(extra: ExtraDetails) {
	const assets = extra.assets ?? [];
	return assets.length === 1 && isMediaAsset(assets[0]);
}

export function getExtraCover(extra: ExtraDetails) {
	const assets = extra.assets ?? [];
	const asset =
		assets.find((item) => item.assetId === extra.coverAssetId) ??
		assets.find((item) => item.fileType === "Image") ??
		assets.find((item) => item.fileType === "Video" && item.thumbnail);
	if (!asset) return null;

	const area = extra.coverCroppedArea;
	return {
		asset,
		// The stored crop only applies to the chosen cover asset.
		crop:
			area && asset.assetId === extra.coverAssetId
				? {
						height: Number(area.height),
						width: Number(area.width),
						x: Number(area.x),
						y: Number(area.y),
					}
				: undefined,
	};
}

// Pending means the bytes never arrived: the upload is still running or stopped in the browser.
export function getAssetStatusLabel(asset: ExtraAssetDetails) {
	switch (asset.processingStatus) {
		case "Completed":
			return null;
		case "Failed":
			return "Failed";
		case "Pending":
			return "Waiting for upload";
		default:
			return "Processing";
	}
}

export function getExtraStatusLabel(extra: ExtraDetails) {
	const labels = (extra.assets ?? []).map(getAssetStatusLabel);
	return (
		labels.find((label) => label === "Failed") ??
		labels.find((label) => label !== null) ??
		null
	);
}

export function formatFileCount(count: number) {
	return `${count} file${count === 1 ? "" : "s"}`;
}
