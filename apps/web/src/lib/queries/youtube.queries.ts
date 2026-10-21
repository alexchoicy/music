import type * as API from "@music/api";
import { queryOptions } from "@tanstack/react-query";

import { $APIFetch, ApiError } from "../APIFetchClient";

type YouTubeImportJobStatus = API.YouTubeImportJobStatus;

const JOB_POLL_INTERVAL_MS = 2000;

export const youtubeQueries = {
	getVideoInfo: (url: string) =>
		queryOptions({
			queryKey: ["youtube", "info", url],
			queryFn: async () => {
				const params = new URLSearchParams({ url });
				const result = await $APIFetch<API.YouTubeVideoInfo>(
					`/youtube/info?${params.toString()}`,
				);

				if (!result.ok) throw result.error;
				return result.data;
			},
			enabled: url.length > 0,
			retry: false,
			staleTime: Infinity,
		}),
	getImportJob: (jobId: string | undefined) =>
		queryOptions({
			queryKey: ["youtube", "jobs", jobId],
			queryFn: async () => {
				const result = await $APIFetch<YouTubeImportJobStatus>(
					`/youtube/jobs/${jobId}`,
				);

				if (!result.ok)
					throw new ApiError("Unable to load import status", result.status);
				return result.data;
			},
			enabled: Boolean(jobId),
			refetchInterval: (query) => {
				const status = query.state.data?.status;
				return status === "Completed" || status === "Failed"
					? false
					: JOB_POLL_INTERVAL_MS;
			},
		}),
};
