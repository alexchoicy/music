import { ListPlus, Play } from "lucide-react";
import { useMemo } from "react";
import type { components } from "@/data/APIschema";
import { getHHMMFromMs } from "@/lib/utils/display";
import { Badge } from "../shadcn/badge";
import { Button } from "../shadcn/button";

type AlbumInfoCardProps = {
	album: components["schemas"]["AlbumDetailsModel"];
};

export function AlbumInfoCard({ album }: AlbumInfoCardProps) {
	const year = useMemo<number | null>(() => {
		if (!album.releaseDate) return null;
		const date = new Date(album.releaseDate);
		return date.getFullYear();
	}, [album.releaseDate]);

	const printTime = useMemo(() => {
		if (!album.totalDurationInMs) return null;

		return getHHMMFromMs(Number(album.totalDurationInMs));
	}, [album.totalDurationInMs]);

	return (
		<div className="relative overflow-hidden rounded-3xl">
			<img
				src={album.coverImageUrl || ""}
				alt="cover"
				className="pointer-events-none absolute -inset-16 h-[calc(100%+8rem)] w-[calc(100%+8rem)]
											object-cover blur-3xl saturate-150 scale-110"
			/>

			<div className="absolute inset-0 bg-linear-to-b from-black/10 via-black/30 to-black/70"></div>

			<div className="absolute inset-0 ring-1 ring-white/10"></div>

			<div className="relative p-6 sm:p-8 flex gap-6">
				<img
					src={album.coverImageUrl || ""}
					className=" rounded-2xl shadow-xl w-48 h-48 object-cover"
					alt="cover"
				/>
				<div className="text-white gap-1 flex flex-col">
					<Badge variant="secondary" className="mb-2">
						{album.type}
					</Badge>
					<div className="text-2xl font-semibold">{album.title}</div>
					<div className="text-white/80 text-lg">
						{album.credits.map((credit) => credit.name).join(" | ")}
					</div>
					<div className="flex items-center gap-2 text-base text-white/70">
						{year != null && (
							<>
								<span>{year}</span>
								<span className="opacity-60">•</span>
							</>
						)}
						<span>{album.totalTrackCount} tracks</span>
						<span className="opacity-60">•</span>
						<span>{printTime}</span>
					</div>
					<div className="flex items-center gap-4 pt-2">
						<Button
							size="lg"
							className="rounded-full h-12 px-8 text-base font-semibold cursor-pointer"
						>
							<Play className="mr-2 h-5 w-5 fill-current" />
							Play
						</Button>
						<Button
							variant="outline"
							size="lg"
							className="rounded-full h-12 px-6 cursor-pointer bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
						>
							<ListPlus className="mr-2 h-5 w-5" />
							Add to Playlist
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
