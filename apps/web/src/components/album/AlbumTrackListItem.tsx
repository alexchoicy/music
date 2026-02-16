import { MoreVertical, Play } from "lucide-react";
import { useMemo } from "react";
import type { components } from "@/data/APIschema";
import { getMMSSFromMs } from "@/lib/utils/display";
import { Button } from "../shadcn/button";
import { DropdownMenu, DropdownMenuTrigger } from "../shadcn/dropdown-menu";

type AlbumTrackListProps = {
	track: components["schemas"]["AlbumTrackDetailsModel"];
};

export function AlbumTrackListItem({ track }: AlbumTrackListProps) {
	const printTime = useMemo(() => {
		if (!track.durationInMs) return null;

		return getMMSSFromMs(Number(track.durationInMs));
	}, [track.durationInMs]);

	return (
		<div className="group grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-4 py-3 hover:bg-secondary">
			<div className="flex w-8 items-center justify-center">
				<div className="group-hover:hidden w-8 flex items-center text-center justify-center shrink-0">
					{track.trackNumber}
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="hidden h-8 w-8 items-center justify-center p-0 group-hover:flex"
				>
					<Play className="size-fit" />
				</Button>
			</div>
			<div className="min-w-0">
				<div className="font-medium text-base">{track.title}</div>
				<div className="text-sm text-muted-foreground">
					{track.credits.map((party) => party.name).join(", ")}
				</div>
			</div>
			<div className="text-sm flex items-center justify-center text-muted-foreground shrink-0 ">
				{printTime}
			</div>
			<div className="w-8 flex items-center justify-center shrink-0">
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								variant="ghost"
								size="icon"
								className=" flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
							>
								<MoreVertical className="size-fit" />
							</Button>
						}
					/>
				</DropdownMenu>
			</div>
		</div>
	);
}
