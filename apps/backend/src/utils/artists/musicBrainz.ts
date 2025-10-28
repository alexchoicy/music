export interface MusicBrainzArtist {
	id: string;
	name: string;
	aliases: MusicBrainzAlias[];
	area: {
		name: string;
	};
}

export interface MusicBrainzAlias {
	'sort-name': string;
	name: string;
	type: string;
}

export interface MusicBrainzResponse {
	artists: MusicBrainzArtist[];
}

export interface MusicBrainzRelationUrl {
	relations: {
		url: {
			resource: string;
		};
	}[];
}

export interface MusicBrainzRelationUrlReturn {
	spotifyID?: string;
	twitterName?: string;
}

export async function searchMusicBrainzByName(artistName: string) {
	const response = await fetch(
		`https://musicbrainz.org/ws/2/artist/?query=artist:${artistName}&fmt=json`,
		{
			headers: {
				'User-Agent':
					'Application MusicApp/0.0.1 (https://github.com/alexchoicy/music)',
			},
		},
	);

	if (!response.ok) {
		return null;
	}

	const data = (await response.json()) as MusicBrainzResponse;

	if (!data.artists.length) {
		return null;
	}

	const result = data.artists[0];

	if (result.name.toLowerCase() !== artistName.toLowerCase()) {
		return null;
	}

	return result;
}

export async function getMusicBrainzRelationUrl(id: string) {
	const response = await fetch(
		`https://musicbrainz.org/ws/2/artist/${id}?inc=url-rels&fmt=json`,
		{
			headers: {
				'User-Agent':
					'Application MusicApp/0.0.1 (https://github.com/alexchoicy/music)',
			},
		},
	);

	if (!response.ok) {
		return null;
	}

	const data = (await response.json()) as MusicBrainzRelationUrl;

	const result: MusicBrainzRelationUrlReturn = {};

	for (const relation of data.relations) {
		const url = relation.url.resource;
		let hostname;

		try {
			hostname = new URL(url).hostname;
		} catch {
			continue;
		}

		if (hostname.includes('spotify.com')) {
			const parts = url.split('/');
			const spotifyID = parts.pop() || parts.pop();
			if (spotifyID) {
				result.spotifyID = spotifyID;
			}
		} else if (
			hostname.includes('twitter.com') ||
			hostname.includes('x.com')
		) {
			const parts = url.split('/');
			const username = parts.pop() || parts.pop();
			if (username) {
				result.twitterName = username;
			}
		}
	}

	return result;
}

export function formatMusicBrainzAlias(
	artistName: string,
	aliases: MusicBrainzAlias[],
) {
	const aliasMap = new Map<string, { name: string; type: string }>();
	const lowerArtist = artistName.toLowerCase();

	for (const item of aliases) {
		const name = item.name;
		const sortName = item['sort-name'];
		const lowerName = name.toLowerCase();
		const lowerSort = sortName.toLowerCase();

		const type = item.type || 'musicBrainz';

		if (lowerName !== lowerArtist) {
			aliasMap.set(lowerName, { name, type });
		}

		if (lowerSort !== lowerName && lowerSort !== lowerArtist) {
			aliasMap.set(lowerSort, { name: sortName, type });
		}
	}

	return Array.from(aliasMap.values());
}
