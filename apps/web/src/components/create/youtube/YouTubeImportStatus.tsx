import type * as API from "@music/api";
import { Link } from "@tanstack/react-router";
import {
	CheckCircle2Icon,
	RotateCcwIcon,
	TriangleAlertIcon,
} from "lucide-react";

import {
	Alert,
	AlertAction,
	AlertDescription,
	AlertTitle,
} from "#/components/base/alert";
import { Button } from "#/components/base/button";
import { Spinner } from "#/components/base/spinner";

export function YouTubeImportStatus({
	albumId,
	errorMessage,
	isRetrying,
	onReset,
	onRetry,
	status,
}: {
	albumId: number | string;
	errorMessage?: null | string;
	isRetrying: boolean;
	onReset: () => void;
	onRetry: () => void;
	status?: API.WorkerJobStatus;
}) {
	if (status === "Failed") {
		return (
			<Alert variant="error">
				<TriangleAlertIcon aria-hidden="true" />
				<AlertTitle>Import failed</AlertTitle>
				<AlertDescription>
					{errorMessage || "The download could not be completed."}
				</AlertDescription>
				<AlertAction>
					<Button
						loading={isRetrying}
						onClick={onRetry}
						size="sm"
						variant="outline"
					>
						<RotateCcwIcon aria-hidden="true" />
						Retry
					</Button>
				</AlertAction>
			</Alert>
		);
	}

	if (status === "Completed") {
		return (
			<Alert variant="success">
				<CheckCircle2Icon aria-hidden="true" />
				<AlertTitle>Cover imported</AlertTitle>
				<AlertDescription>
					Audio is being processed and will be playable shortly.
				</AlertDescription>
				<AlertAction>
					<Button
						render={<Link params={{ id: String(albumId) }} to="/albums/$id" />}
						size="sm"
						variant="outline"
					>
						Open single
					</Button>
					<Button onClick={onReset} size="sm" variant="ghost">
						Import another
					</Button>
				</AlertAction>
			</Alert>
		);
	}

	return (
		<Alert variant="info">
			<Spinner aria-hidden="true" />
			<AlertTitle>Downloading from YouTube…</AlertTitle>
			<AlertDescription>
				Fetching the highest quality audio and thumbnail on the server.
			</AlertDescription>
		</Alert>
	);
}
