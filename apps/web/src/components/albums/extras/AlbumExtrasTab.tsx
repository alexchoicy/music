import { useQuery } from "@tanstack/react-query";
import { BookImageIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "#/components/coss/button";
import { Skeleton } from "#/components/coss/skeleton";
import { LibraryEmptyState } from "#/components/LibraryEmptyState";
import { extraQueries } from "#/lib/queries/extra.queries";
import type { ExtraDetails } from "#/lib/queries/extra.queries";

import { ExtraCard } from "./ExtraCard";
import { ExtraEditDialog } from "./ExtraEditDialog";
import { hasUnfinishedAssets } from "./extraUtils";

type DialogState = { mode: "create" } | { mode: "edit"; extra: ExtraDetails };

export function AlbumExtrasTab({ albumId }: { albumId: number }) {
	const [dialog, setDialog] = useState<DialogState | null>(null);
	const { data: extras, isPending } = useQuery({
		...extraQueries.getAlbumExtras(albumId),
		// Pick up thumbnails once the worker finishes
		refetchInterval: (query) =>
			hasUnfinishedAssets(query.state.data) ? 4000 : false,
	});

	return (
		<section className="grid gap-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h2 className="text-lg font-semibold">Extras</h2>
					<p className="text-sm text-muted-foreground">
						Booklet scans, packaging, inserts and bonus content for this album.
					</p>
				</div>
				<Button onClick={() => setDialog({ mode: "create" })}>
					<PlusIcon aria-hidden="true" />
					New extra
				</Button>
			</div>

			{isPending ? (
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
					{Array.from({ length: 4 }, (_, index) => (
						<Skeleton className="aspect-square" key={index} />
					))}
				</div>
			) : extras && extras.length > 0 ? (
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
					{extras.map((extra) => (
						<ExtraCard
							extra={extra}
							key={extra.extraId}
							onOpen={() => setDialog({ mode: "edit", extra })}
						/>
					))}
				</div>
			) : (
				<LibraryEmptyState
					description="Add a booklet, packaging scan or bonus file to get started."
					icon={<BookImageIcon aria-hidden="true" />}
					title="No extras yet"
				/>
			)}

			{dialog && (
				<ExtraEditDialog
					albumId={albumId}
					extra={dialog.mode === "edit" ? dialog.extra : undefined}
					key={dialog.mode === "edit" ? dialog.extra.extraId : "create"}
					onClose={() => setDialog(null)}
				/>
			)}
		</section>
	);
}
