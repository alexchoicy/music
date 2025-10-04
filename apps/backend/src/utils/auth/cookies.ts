import { Response } from 'express';

const AUTH_COOKIE_NAME = 'music_auth_token';

export function setAuthCookies(
	res: Response,
	token: string,
	cookieDomains: string,
) {
	res.cookie(AUTH_COOKIE_NAME, token, {
		httpOnly: true,
		secure: true,
		sameSite: 'none',
		domain: cookieDomains,
		path: '/',
	});
}

export function getAuthTokenFromCookies(req: {
	cookies: { [key: string]: string };
}) {
	return req.cookies[AUTH_COOKIE_NAME];
}

export function clearAuthCookies(res: Response) {
	res.clearCookie(AUTH_COOKIE_NAME, {
		httpOnly: true,
		secure: true,
		sameSite: 'none',
		path: '/',
	});
}
