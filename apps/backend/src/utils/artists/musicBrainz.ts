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
		if (url.includes('spotify.com')) {
			const parts = url.split('/');
			const spotifyID = parts.pop() || parts.pop();
			if (spotifyID) {
				result.spotifyID = spotifyID;
			}
		} else if (url.includes('twitter.com') || url.includes('x.com')) {
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
	const alias = [];

	for (const item of aliases) {
		if (item.name.toLowerCase() !== artistName.toLowerCase()) {
			alias.push(item.name);
		}

		if (
			item['sort-name'].toLowerCase() !== item.name.toLowerCase() &&
			item['sort-name'].toLowerCase() !== artistName.toLowerCase()
		) {
			alias.push(item['sort-name']);
		}
	}
	return alias;
}
