import { QueryCache, QueryClient } from "@tanstack/react-query";

import { ApiError } from "#/lib/APIFetchClient";

function isClientError(error: unknown) {
	return error instanceof ApiError && error.status >= 400 && error.status < 500;
}

export function getContext({ onUnauthorized }: { onUnauthorized: () => void }) {
	const queryClient = new QueryClient({
		queryCache: new QueryCache({
			onError: (error, query) => {
				if (query.queryKey[0] === "auth") return;
				if (error instanceof ApiError && error.status === 401) onUnauthorized();
			},
		}),
		defaultOptions: {
			queries: {
				staleTime: 30_000,
				retry: (failureCount, error) =>
					!isClientError(error) && failureCount < 2,
			},
		},
	});

	return {
		queryClient,
	};
}
export default function TanstackQueryProvider() {}
