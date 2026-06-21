import type { components } from "#/data/APIschema";

import { ConcertFileCard } from "./ConcertFileCard";

type ConcertFile = components["schemas"]["ConcertFileDetails"];

type ConcertFilesPanelProps = {
	files: ConcertFile[];
	currentPlayingId?: ConcertFile["concertFileId"] | null;
	onSelectFile: (file: ConcertFile) => void;
};

export function ConcertFilesPanel({
	files,
	currentPlayingId,
	onSelectFile,
}: ConcertFilesPanelProps) {
	return (
		<aside className="flex w-80 shrink-0 flex-col gap-2 pt-0.5">
			<h2 className="px-0.5 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
				Files ({files.length})
			</h2>
			<div className="flex flex-col gap-2">
				{files.map((file) => (
					<ConcertFileCard
						file={file}
						isCurrentPlaying={file.concertFileId === currentPlayingId}
						key={file.concertFileId}
						onSelect={() => onSelectFile(file)}
					/>
				))}
			</div>
		</aside>
	);
}
