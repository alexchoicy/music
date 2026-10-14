import { DragDropProvider, PointerSensor } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import {
	GripVerticalIcon,
	ListMusicIcon,
	Music2Icon,
	XIcon,
} from "lucide-react";
import { useRef } from "react";

import { Button } from "#/components/base/button";
import {
	Sheet,
	SheetDescription,
	SheetHeader,
	SheetPanel,
	SheetPopup,
	SheetTitle,
	SheetTrigger,
} from "#/components/base/sheet";
import { formatMsToMMSSOrHMMSS } from "#/lib/utils/music";
import { cn } from "#/lib/utils/styles";
import { useAudioPlayerStore } from "#/store/audioPlayer/audioPlayerStore";
import type {
	AudioPlayerQueueEntry,
	AudioPlayerState,
} from "#/store/audioPlayer/audioPlayerType";

const queueSensors = [PointerSensor];

type QueueSheetProps = {
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	index: number;
	queue: AudioPlayerState["queue"];
	queueLength: number;
	playQueueTrack: (index: number) => void;
	removeFromQueue: (index: number) => void;
	moveQueueTrack: (fromIndex: number, toIndex: number) => void;
	clearQueue: () => void;
};

export function QueueSheet({
	isOpen,
	onOpenChange,
	index,
	queue,
	queueLength,
	playQueueTrack,
	removeFromQueue,
	moveQueueTrack,
	clearQueue,
}: QueueSheetProps) {
	const queueAtDragStart = useRef(queue);

	return (
		<Sheet open={isOpen} onOpenChange={onOpenChange}>
			<SheetTrigger
				render={<Button aria-label="Queue" size="icon-lg" variant="player" />}
			>
				<ListMusicIcon aria-hidden="true" />
			</SheetTrigger>
			<SheetPopup side="right">
				<SheetHeader>
					<SheetTitle>Queue</SheetTitle>
					<SheetDescription>
						{queueLength === 0
							? "No tracks queued."
							: `${queueLength} track${queueLength === 1 ? "" : "s"} queued.`}
					</SheetDescription>
					<Button
						className="self-start"
						disabled={queueLength <= 1}
						onClick={clearQueue}
						size="sm"
						variant="outline"
					>
						Clear queue
					</Button>
				</SheetHeader>
				<SheetPanel>
					<div className="flex flex-col gap-1">
						{queueLength === 0 ? (
							<div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center text-muted-foreground">
								<ListMusicIcon aria-hidden="true" className="size-6" />
								<p className="text-sm">Your queue is empty.</p>
							</div>
						) : (
							<DragDropProvider
								sensors={queueSensors}
								onDragStart={() => {
									queueAtDragStart.current = queue;
								}}
								onDragEnd={(event) => {
									const { source, target } = event.operation;
									if (
										event.canceled ||
										!target ||
										!isSortable(source) ||
										useAudioPlayerStore.getState().queue !==
											queueAtDragStart.current
									)
										return;
									moveQueueTrack(source.initialIndex, source.index);
								}}
							>
								{queue.map((track, trackIndex) => (
									<QueueTrackRow
										key={track.queueEntryId}
										track={track}
										trackIndex={trackIndex}
										isCurrent={trackIndex === index}
										queueLength={queueLength}
										playQueueTrack={playQueueTrack}
										removeFromQueue={removeFromQueue}
									/>
								))}
							</DragDropProvider>
						)}
					</div>
				</SheetPanel>
			</SheetPopup>
		</Sheet>
	);
}

type QueueTrackRowProps = Pick<
	QueueSheetProps,
	"queueLength" | "playQueueTrack" | "removeFromQueue"
> & {
	track: AudioPlayerQueueEntry;
	trackIndex: number;
	isCurrent: boolean;
};

function QueueTrackRow({
	track,
	trackIndex,
	isCurrent,
	queueLength,
	playQueueTrack,
	removeFromQueue,
}: QueueTrackRowProps) {
	const { ref, handleRef, isDragging } = useSortable({
		id: track.queueEntryId,
		index: trackIndex,
		group: "audio-player-queue",
		disabled: queueLength < 2,
	});

	return (
		<div
			className={cn(
				"relative flex min-w-0 items-center gap-1 rounded-lg pr-1",
				isCurrent && "bg-accent text-foreground",
				isDragging && "z-10 bg-accent shadow-lg",
			)}
			ref={ref}
		>
			<Button
				aria-label={`Drag ${track.title} to reorder, queue item ${trackIndex + 1}`}
				className="touch-none"
				disabled={queueLength < 2}
				ref={handleRef}
				size="icon-sm"
				variant="ghost"
			>
				<GripVerticalIcon aria-hidden="true" />
			</Button>
			<button
				aria-current={isCurrent ? "true" : undefined}
				aria-label={`Play ${track.title}, queue item ${trackIndex + 1}`}
				className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
				onClick={() => playQueueTrack(trackIndex)}
				type="button"
			>
				<div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
					{track.albumCoverUrl ? (
						<img
							alt=""
							className="h-full w-full object-cover"
							src={track.albumCoverUrl}
						/>
					) : (
						<Music2Icon aria-hidden="true" className="size-5" />
					)}
				</div>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium">{track.title}</p>
					<p className="truncate text-xs text-muted-foreground">
						{track.party.length > 0
							? track.party.map((party) => party.name).join(", ")
							: track.albumTitle}
					</p>
				</div>
				<span className="hidden shrink-0 text-xs text-muted-foreground tabular-nums sm:inline">
					{formatMsToMMSSOrHMMSS(track.durationInMs)}
				</span>
			</button>
			<div className="flex shrink-0 items-center gap-1">
				<Button
					aria-label={`Remove ${track.title} from queue, queue item ${trackIndex + 1}`}
					onClick={() => removeFromQueue(trackIndex)}
					size="icon-sm"
					variant="ghost"
				>
					<XIcon aria-hidden="true" />
				</Button>
			</div>
		</div>
	);
}
