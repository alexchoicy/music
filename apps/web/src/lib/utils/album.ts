type CoverVariant = {
	url: string;
};

export function getCoverUrl(variants?: null | CoverVariant[]) {
	return variants?.[0]?.url ?? null;
}
