import type {
	ExtraAssetDetails,
	ExtraDetails,
} from "#/lib/queries/extra.queries";
import type { CroppedArea } from "#/store/albumUploadStoreType";

export function getAssetThumbnailUrl(asset: ExtraAssetDetails) {
	if (asset.fileType !== "Image") return undefined;
	return asset.thumbnail?.url ?? asset.preview?.url ?? asset.original?.url;
}

export function getAssetPreviewUrl(asset: ExtraAssetDetails) {
	if (asset.fileType !== "Image") return undefined;
	return asset.preview?.url ?? asset.original?.url;
}

export function toCroppedArea(
	area: ExtraDetails["coverCroppedArea"],
): CroppedArea | undefined {
	if (!area) return undefined;
	return {
		x: Number(area.x),
		y: Number(area.y),
		width: Number(area.width),
		height: Number(area.height),
	};
}

export function getExtraCover(extra: ExtraDetails) {
	const assets = extra.assets ?? [];
	const asset =
		assets.find((item) => item.assetId === extra.coverAssetId) ??
		assets.find((item) => item.fileType === "Image");

	if (!asset) return null;

	return {
		asset,
		// The stored crop only applies to the chosen cover asset
		croppedArea:
			asset.assetId === extra.coverAssetId
				? toCroppedArea(extra.coverCroppedArea)
				: undefined,
	};
}

// Pending = bytes never arrived (upload still running or failed in the browser)
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

export function isAssetUnfinished(asset: ExtraAssetDetails) {
	return (
		asset.processingStatus !== "Completed" &&
		asset.processingStatus !== "Failed"
	);
}

export function hasUnfinishedAssets(extras: ExtraDetails[] | undefined) {
	return (
		extras?.some((extra) => (extra.assets ?? []).some(isAssetUnfinished)) ??
		false
	);
}
