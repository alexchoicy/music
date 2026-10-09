import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Card, CardHeader, CardPanel, CardTitle } from "#/components/coss/card";
import { extraQueries } from "#/lib/queries/extra.queries";
import type { ExtraDetails } from "#/lib/queries/extra.queries";

import { ExtraCard } from "./ExtraCard";
import { ExtraViewerDialog } from "./ExtraViewerDialog";

// Shown on the album page only when the album has extras
export function AlbumExtrasSection({ albumId }: { albumId: number }) {
	const [viewing, setViewing] = useState<ExtraDetails | null>(null);
	const { data: extras } = useQuery(extraQueries.getAlbumExtras(albumId));

	if (!extras || extras.length === 0) return null;

	return (
		<Card data-testid="album-extras-section">
			<CardHeader>
				<CardTitle>Extras</CardTitle>
			</CardHeader>
			<CardPanel>
				<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
					{extras.map((extra) => (
						<ExtraCard
							extra={extra}
							key={extra.extraId}
							onOpen={() => setViewing(extra)}
						/>
					))}
				</div>
			</CardPanel>

			{viewing && (
				<ExtraViewerDialog
					extra={viewing}
					key={viewing.extraId}
					onClose={() => setViewing(null)}
				/>
			)}
		</Card>
	);
}
