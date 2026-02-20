import { Link } from "@tanstack/react-router";
import { Download, ListPlus, Play } from "lucide-react";
import pMap from "p-map";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { components } from "@/data/APIschema";
import { downloadAlbumTracks } from "@/lib/queries/album.queries";
import { getHHMMFromMs } from "@/lib/utils/display";
import { Badge } from "../shadcn/badge";
import { Button } from "../shadcn/button";

async function downloadWithProgress(
	url: string,
	writable: FileSystemWritableFileStream,
	onProgress?: (percent: number) => void,
) {
	const response = await fetch(url);

	if (!response.body) throw new Error("No response body");

	const contentLength = Number(response.headers.get("Content-Length")) || 0;

	const reader = response.body.getReader();
	const writer = writable.getWriter();

	let received = 0;

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		await writer.write(value);
		received += value.length;

		if (contentLength && onProgress) {
			onProgress(Math.round((received / contentLength) * 100));
		}
	}

	await writer.close();
}

export async function zipAndDownloadTracks(
	tracks: components["schemas"]["AlbumTrackDownloadItemModel"][],
	zipName = "album.zip",
	opts?: {
		concurrency?: number;
		onFileDone?: (done: number, total: number, fileName: string) => void;
	},
) {
	const JSZip = (await import("jszip")).default;

	const zip = new JSZip();
	const total = tracks.length;
	let done = 0;

	await pMap(
		tracks,
		async (track) => {
			const res = await fetch(track.url);
			if (!res.ok) throw new Error(`Failed to fetch ${track.fileName}`);

			// Pull into memory (ArrayBuffer) for zipping
			const data = await res.arrayBuffer();
			zip.file(track.fileName, data);

			done++;
			opts?.onFileDone?.(done, total, track.fileName);
		},
		{ concurrency: opts?.concurrency ?? 3 },
	);

	const zipBlob = await zip.generateAsync({ type: "blob" });

	const objectUrl = URL.createObjectURL(zipBlob);
	const a = document.createElement("a");
	a.href = objectUrl;
	a.download = zipName;
	a.rel = "noopener noreferrer";
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(objectUrl);
}

type AlbumInfoCardProps = {
	album: components["schemas"]["AlbumDetailsModel"];
	handlePlay: (trackId?: number) => void;
};

export function AlbumInfoCard({ album, handlePlay }: AlbumInfoCardProps) {
	const [isDownloading, setIsDownloading] = useState(false);

	const year = useMemo<number | null>(() => {
		if (!album.releaseDate) return null;
		const date = new Date(album.releaseDate);
		return date.getFullYear();
	}, [album.releaseDate]);

	const printTime = useMemo(() => {
		if (!album.totalDurationInMs) return null;

		return getHHMMFromMs(Number(album.totalDurationInMs));
	}, [album.totalDurationInMs]);

	const handleDownload = async (
		variant: components["schemas"]["FileObjectVariant"],
	) => {
		if (isDownloading) return;

		setIsDownloading(true);

		try {
			const tracks = await downloadAlbumTracks(album.albumId, variant);

			// @ts-expect-error, the type is correct, but it is not the ts inference
			if (typeof window.showDirectoryPicker === "function") {
				// @ts-expect-error, the type is correct, but it is not the ts inference
				const dirHandle = await window.showDirectoryPicker();

				await pMap(
					tracks,
					async (track) => {
						const fileHandle = await dirHandle.getFileHandle(track.fileName, {
							create: true,
						});

						const writable = await fileHandle.createWritable();

						await downloadWithProgress(track.url, writable, (percent) => {
							console.log(track.fileName, percent);
						});
					},
					{
						concurrency: 3,
					},
				);
			} else {
				await zipAndDownloadTracks(tracks, `${album.title}.zip`, {
					concurrency: 3,
					onFileDone: (done, total, name) => {
						console.log(`Fetched ${done}/${total}: ${name}`);
					},
				});
			}
		} catch {
			toast.error("Failed to download album tracks");
		} finally {
			setIsDownloading(false);
		}
	};

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

			<div className="relative p-6 sm:p-8 grid gap-6 lg:flex">
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
						{album.credits.map((artist, i) => (
							<span key={artist.partyId} className="inline">
								{i > 0 && <span className="px-1">|</span>}
								<Link
									to="/parties/$id"
									params={{ id: artist.partyId.toString() }}
									className="hover:underline"
								>
									{artist.name}
								</Link>
							</span>
						))}
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
					<div className="grid lg:flex items-center gap-4 pt-2">
						<Button
							size="lg"
							className="rounded-full h-12 px-8 text-base font-semibold cursor-pointer"
							onClick={() => handlePlay()}
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
						<Button
							variant="outline"
							className="rounded-full h-12 px-6 cursor-pointer bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
							disabled={isDownloading}
							onClick={() => handleDownload("Original")}
						>
							<Download className="h-5 w-5" />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
