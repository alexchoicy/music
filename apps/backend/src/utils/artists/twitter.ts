export interface TwitterProfileImage {
	data: {
		profile_image_url: string;
	};
}

export interface TwitterProfileBanner {
	data: {
		profile_banner_url: string;
	};
}

async function fetchWithRetry(
	url: string,
	token: string,
	retries = 1,
	delay = 15 * 60 * 1000,
) {
	//becuase free twitter api is on99, only 3 request per 15 minutes
	for (let attempt = 0; attempt <= retries; attempt++) {
		const response = await fetch(url, {
			headers: { Authorization: `Bearer ${token}` },
		});

		if (response.ok) {
			return response;
		}

		if (attempt < retries) {
			console.warn(
				`Fetch failed. Retrying in ${delay / 1000 / 60} minutes...`,
			);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	return null;
}

export async function getTwitterProfileImgUrl(
	twitterName: string,
	token: string,
) {
	const url = `https://api.x.com/2/users/by/username/${twitterName}?user.fields=profile_image_url`;

	const data = await fetchWithRetry(url, token, 1);

	if (!data) {
		return null;
	}

	const result = (await data.json()) as TwitterProfileImage;
	if (!result.data.profile_image_url) {
		return null;
	}
	const rawImage = result.data.profile_image_url.replace('_normal', '');
	return rawImage;
}

export async function getTwitterProfileBannerUrl(
	twitterName: string,
	token: string,
) {
	const url = `https://api.x.com/2/users/by/username/${twitterName}?user.fields=profile_banner_url`;

	const data = await fetchWithRetry(url, token, 1);
	if (!data) {
		return null;
	}

	const result = (await data.json()) as TwitterProfileBanner;
	if (!result.data.profile_banner_url) {
		return null;
	}
	const rawImage = result.data.profile_banner_url.replace('_normal', '');
	return rawImage;
}

export async function getImageBufferFromUrl(url: string) {
	const data = await fetch(url);
	if (!data.ok) {
		return null;
	}
	const buffer = await data.arrayBuffer();
	return {
		buffer: Buffer.from(buffer),
		contentType: data.headers.get('content-type') || 'image/jpeg',
	};
}
