import { AwsClient } from 'aws4fetch';

const UNSIGNABLE_HEADERS = [
	// These headers appear in the request, but are never passed upstream
	'x-forwarded-proto',
	'x-real-ip',
	// We can't include accept-encoding in the signature because Cloudflare
	// sets the incoming accept-encoding header to "gzip, br", then modifies
	// the outgoing request to set accept-encoding to "gzip".
	// Not cool, Cloudflare!
	'accept-encoding',
	// Conditional headers are not consistently passed upstream
	'if-match',
	'if-modified-since',
	'if-none-match',
	'if-range',
	'if-unmodified-since',
];

function filterHeaders(headers: Headers) {
	// Suppress irrelevant IntelliJ warning
	// noinspection JSCheckFunctionSignatures
	return new Headers(Array.from(headers.entries()).filter((pair) => !(UNSIGNABLE_HEADERS.includes(pair[0]) || pair[0].startsWith('cf-'))));
}

export function getMusicStorePath(hash: string) {
	const firstSubPath = hash.slice(0, 2);
	const secondSubPath = hash.slice(2, 4);
	return `${firstSubPath}/${secondSubPath}`;
}

function createHeadResponse(response: Response) {
	return new Response(null, {
		headers: response.headers,
		status: response.status,
		statusText: response.statusText,
	});
}

const RANGE_RETRY_ATTEMPTS = 3;

export default {
	// Our fetch handler is invoked on a HTTP request: we can send a message to a queue
	// during (or after) a request.
	// https://developers.cloudflare.com/queues/platform/javascript-apis/#producer
	async fetch(req, env, ctx): Promise<Response> {
		// To send a message on a queue, we need to create the queue first
		// https://developers.cloudflare.com/queues/get-started/#3-create-a-queue
		if (!['GET', 'HEAD'].includes(req.method)) {
			return new Response(null, {
				status: 405,
				statusText: 'Method Not Allowed',
			});
		}
		const requestMethod = req.method;

		const url = new URL(req.url);

		let path = url.pathname.replace(/^\//, '');
		path = path.replace(/\/$/, '');

		const urlpart = path.split('/');

		const contentType = urlpart[0];
		const mediaType = urlpart[1];

		let s3url = '';

		if (mediaType === 'music') {
			const quality = urlpart[2];
			const hashExt = urlpart[5];
			const hash = hashExt.split('.')[0];
			const hashpath = getMusicStorePath(hash);
			s3url = `https://${await env.BUCKET_ENDPOINT.get()}/${await env.BUCKET_NAME.get()}/${contentType}/${mediaType}/${quality}/${hashpath}/${hashExt}`;
		} else if (mediaType === 'attachments') {
			const attachmentType = urlpart[2];
			const filename = urlpart[3];

			s3url = `https://${await env.BUCKET_ENDPOINT.get()}/${await env.BUCKET_NAME.get()}/${contentType}/${mediaType}/${attachmentType}/${filename}`;
		}

		if (!s3url) {
			return new Response('Bad Request', {
				status: 400,
				statusText: 'Bad Request',
			});
		}

		const headers = filterHeaders(req.headers);

		const client = new AwsClient({
			accessKeyId: await env.BUCKET_KEYID.get(),
			secretAccessKey: await env.BUCKET_KEY.get(),
			service: 's3',
		});

		const signedRequest = await client.sign(s3url, {
			method: 'GET',
			headers: headers,
		});

		if (signedRequest.headers.has('range')) {
			let attempts = RANGE_RETRY_ATTEMPTS;
			let response;
			do {
				let controller = new AbortController();
				response = await fetch(signedRequest.url, {
					method: signedRequest.method,
					headers: signedRequest.headers,
					signal: controller.signal,
				});
				if (response.headers.has('content-range')) {
					// Only log if it didn't work first time
					if (attempts < RANGE_RETRY_ATTEMPTS) {
						console.log(`Retry for ${signedRequest.url} succeeded - response has content-range header`);
					}
					// Break out of loop and return the response
					break;
				} else if (response.ok) {
					attempts -= 1;
					console.error(
						`Range header in request for ${signedRequest.url} but no content-range header in response. Will retry ${attempts} more times`
					);
					// Do not abort on the last attempt, as we want to return the response
					if (attempts > 0) {
						controller.abort();
					}
				} else {
					// Response is not ok, so don't retry
					break;
				}
			} while (attempts > 0);

			if (attempts <= 0) {
				console.error(`Tried range request for ${signedRequest.url} ${RANGE_RETRY_ATTEMPTS} times, but no content-range in response.`);
			}

			if (requestMethod === 'HEAD') {
				// Original request was HEAD, so return a new Response without a body
				return createHeadResponse(response);
			}

			// Return whatever response we have rather than an error response
			// This response cannot be aborted, otherwise it will raise an exception
			return response;
		}
		const fetchPromise = fetch(signedRequest);

		if (requestMethod === 'HEAD') {
			const response = await fetchPromise;
			// Original request was HEAD, so return a new Response without a body
			return createHeadResponse(response);
		}

		// Return the upstream response unchanged
		return fetchPromise;
	},
} satisfies ExportedHandler<Env, Error>;
