import { useQuery } from "@tanstack/react-query";
import { BookImageIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { ExtraTile } from "#/components/album/extras/AlbumExtras";
import { hasUnfinishedAssets } from "#/components/album/extras/extraAssets";
import { Button } from "#/components/base/button";
import { Skeleton } from "#/components/base/skeleton";
import { LibraryEmptyState } from "#/components/library/LibraryStates";
import { extraQueries } from "#/lib/queries/extra.queries";
import type { ExtraDetails } from "#/lib/queries/extra.queries";

import { ExtraEditDialog } from "./ExtraEditDialog";

// The dialog keeps the extra as it was opened, so its version check still catches outside changes
type DialogState = { mode: "create" } | { mode: "edit"; extra: ExtraDetails };

const GRID_CLASS =
	"-mx-2 grid grid-cols-2 gap-x-2 gap-y-1 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]";

export function AlbumExtrasEditor({ albumId }: { albumId: number }) {
	const [dialog, setDialog] = useState<DialogState | null>(null);
	const { data: extras, isPending } = useQuery({
		...extraQueries.getAlbumExtras(albumId),
		// Pick up thumbnails once the worker finishes
		refetchInterval: (query) =>
			hasUnfinishedAssets(query.state.data) ? 4000 : false,
	});

	return (
		<section aria-labelledby="edit-extras" className="flex flex-col gap-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div className="flex flex-col gap-1">
					<h2 className="text-xl font-semibold tracking-tight" id="edit-extras">
						Extras
					</h2>
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
				<div aria-hidden="true" className={GRID_CLASS}>
					{Array.from({ length: 4 }, (_, index) => (
						<div className="p-2" key={index}>
							<Skeleton className="aspect-square w-full" shape="tile" />
						</div>
					))}
				</div>
			) : extras && extras.length > 0 ? (
				<ul className={GRID_CLASS}>
					{extras.map((extra) => (
						<li
							className="min-w-0"
							data-testid="extra-card"
							key={extra.extraId}
						>
							<ExtraTile
								extra={extra}
								onOpen={() => setDialog({ mode: "edit", extra })}
							/>
						</li>
					))}
				</ul>
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
