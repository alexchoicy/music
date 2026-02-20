import { Download, MoreVertical, Play } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { components } from "@/data/APIschema";
import { downloadTrack } from "@/lib/queries/track.queries";
import { getMMSSFromMs } from "@/lib/utils/display";
import { Button } from "../shadcn/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "../shadcn/dropdown-menu";

type AlbumTrackListProps = {
	track: components["schemas"]["AlbumTrackDetailsModel"];
};

export function AlbumTrackListItem({ track }: AlbumTrackListProps) {
	const [isDownloading, setIsDownloading] = useState(false);

	const printTime = useMemo(() => {
		if (!track.durationInMs) return null;

		return getMMSSFromMs(Number(track.durationInMs));
	}, [track.durationInMs]);

	const handleDownload = async () => {
		if (isDownloading) return;

		setIsDownloading(true);

		try {
			const downloadItem = await downloadTrack(track.trackId, "Original");

			const anchor = document.createElement("a");
			anchor.href = downloadItem.url;
			anchor.download = downloadItem.fileName;
			anchor.rel = "noopener noreferrer";
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
		} catch {
			toast.error("Failed to download track");
		} finally {
			setIsDownloading(false);
		}
	};

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
					<DropdownMenuContent className="w-auto">
						<DropdownMenuGroup>
							<DropdownMenuLabel className="flex flex-row items-center gap-2">
								<Download className="size-4" />
								{isDownloading ? "Downloading..." : "Download"}
							</DropdownMenuLabel>
							<DropdownMenuSub>
								{/* Maybe or may not hardcoded*/}
								<DropdownMenuSubTrigger>
									Original (Rank 0 / Pinned)
								</DropdownMenuSubTrigger>
								<DropdownMenuPortal>
									<DropdownMenuSubContent>
										<DropdownMenuItem
											onClick={handleDownload}
											disabled={isDownloading}
										>
											Original
										</DropdownMenuItem>
									</DropdownMenuSubContent>
								</DropdownMenuPortal>
							</DropdownMenuSub>
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}
