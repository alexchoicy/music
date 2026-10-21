import { useEffect, useRef } from "react";
import type { RefObject } from "react";

// Frames are sampled this small; the blur hides the low resolution.
const SAMPLE_WIDTH = 32;
const SAMPLE_HEIGHT = 18;
const SAMPLE_INTERVAL_MS = 1000;

// A soft glow behind the video that follows its colours. Two canvases take
// turns so each new sample fades in over the previous one.
export function ConcertAmbientLight({
	videoRef,
}: {
	videoRef: RefObject<HTMLVideoElement | null>;
}) {
	const firstRef = useRef<HTMLCanvasElement>(null);
	const secondRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const video = videoRef.current;
		const canvases = [firstRef.current, secondRef.current];
		if (!video || !canvases[0] || !canvases[1]) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const layers = canvases as [HTMLCanvasElement, HTMLCanvasElement];
		let active = 0;

		const sample = () => {
			if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
			const next = layers[1 - active];
			const context = next.getContext("2d");
			if (!context) return;
			context.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
			next.style.opacity = "1";
			layers[active].style.opacity = "0";
			active = 1 - active;
		};

		const clear = () => {
			for (const layer of layers) layer.style.opacity = "0";
		};

		const interval = window.setInterval(() => {
			if (!video.paused) sample();
		}, SAMPLE_INTERVAL_MS);
		video.addEventListener("loadeddata", sample);
		video.addEventListener("seeked", sample);
		video.addEventListener("emptied", clear);
		sample();

		return () => {
			window.clearInterval(interval);
			video.removeEventListener("loadeddata", sample);
			video.removeEventListener("seeked", sample);
			video.removeEventListener("emptied", clear);
		};
	}, [videoRef]);

	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 -z-10 scale-110 opacity-70 blur-[56px] saturate-[1.4] motion-reduce:hidden"
		>
			{[firstRef, secondRef].map((ref, index) => (
				<canvas
					className="absolute inset-0 size-full opacity-0 transition-opacity duration-1000 ease-linear motion-reduce:transition-none"
					height={SAMPLE_HEIGHT}
					key={index}
					ref={ref}
					width={SAMPLE_WIDTH}
				/>
			))}
		</div>
	);
}
