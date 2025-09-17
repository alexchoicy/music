import { Response } from 'express';

export function setAuthCookies(
	res: Response,
	token: string,
	expiresIn: number,
) {
	res.cookie('music_auth_token', token, {
		httpOnly: true,
		secure: true,
		sameSite: 'none',
		domain: 'localhost',
		path: '/',
		// maxAge: expiresIn * 1000, // Convert to milliseconds
	});
}

export function clearAuthCookies(res: Response) {
	res.clearCookie('music_auth_token', {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
	});
}

export function getAuthTokenFromCookies(req: {
	cookies: { [key: string]: string };
}) {
	return req.cookies['music_auth_token'];
}
