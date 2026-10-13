import { FocusIcon, MaximizeIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import type { PointerEvent, ReactNode } from "react";

import { Button } from "#/components/base/button";
import {
	Tooltip,
	TooltipPopup,
	TooltipTrigger,
} from "#/components/base/tooltip";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;
// Below this, cards get too small to read; start centred on the party instead.
const MIN_FIT_ZOOM = 0.6;
const clampZoom = (zoom: number) =>
	Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

type View = { x: number; y: number; zoom: number };

function panView(view: View, dx: number, dy: number): View {
	return { ...view, x: view.x - dx / view.zoom, y: view.y - dy / view.zoom };
}

function zoomView(view: View, factor: number, x = 0, y = 0): View {
	const zoom = clampZoom(view.zoom * factor);
	return {
		x: view.x + x / view.zoom - x / zoom,
		y: view.y + y / view.zoom - y / zoom,
		zoom,
	};
}

export function RelationshipCanvas({
	width,
	height,
	focus,
	children,
}: {
	width: number;
	height: number;
	focus?: { x: number; y: number };
	children: ReactNode;
}) {
	const viewport = useRef<HTMLDivElement>(null);
	const instructionsId = useId();
	const [view, setView] = useState<View>({
		x: width / 2,
		y: height / 2,
		zoom: 1,
	});
	const [dragging, setDragging] = useState(false);
	const drag = useRef<{
		pointerId: number;
		startX: number;
		startY: number;
		view: View;
		moved: boolean;
	} | null>(null);
	const suppressClick = useRef(false);

	const fitView = useCallback(
		(container: HTMLDivElement, preferFocus: boolean): View => {
			const fit = Math.min(
				1,
				(container.clientWidth - 48) / width,
				(container.clientHeight - 48) / height,
			);
			if (preferFocus && fit < MIN_FIT_ZOOM && focus)
				return { ...focus, zoom: 0.85 };
			return { x: width / 2, y: height / 2, zoom: clampZoom(fit) };
		},
		[focus, height, width],
	);

	const attachViewport = useCallback(
		(container: HTMLDivElement | null) => {
			if (!container) return;
			viewport.current = container;
			const scrollViewport = container.closest<HTMLElement>(
				'[data-slot="scroll-area-viewport"]',
			);
			const resize = () => {
				if (!scrollViewport) return;
				const top =
					container.getBoundingClientRect().top -
					scrollViewport.getBoundingClientRect().top +
					scrollViewport.scrollTop;
				container.style.height = `${Math.max(360, scrollViewport.clientHeight - top - 24)}px`;
			};
			const observer = new ResizeObserver(resize);
			if (scrollViewport) observer.observe(scrollViewport);
			resize();
			setView(fitView(container, true));

			const wheel = (event: WheelEvent) => {
				event.preventDefault();
				const unit =
					event.deltaMode === 1
						? 16
						: event.deltaMode === 2
							? container.clientHeight
							: 1;
				const bounds = container.getBoundingClientRect();
				setView((current) =>
					zoomView(
						current,
						Math.exp(-event.deltaY * unit * 0.002),
						event.clientX - bounds.left - bounds.width / 2,
						event.clientY - bounds.top - bounds.height / 2,
					),
				);
			};
			// React's wheel handler is passive and cannot stop the page scrolling.
			container.addEventListener("wheel", wheel, { passive: false });
			return () => {
				observer.disconnect();
				container.removeEventListener("wheel", wheel);
				viewport.current = null;
			};
		},
		[fitView],
	);

	function fitAll() {
		if (viewport.current) setView(fitView(viewport.current, false));
	}

	function centerParty() {
		if (focus) setView({ ...focus, zoom: 1 });
	}

	function zoomBy(factor: number) {
		setView((current) => zoomView(current, factor));
	}

	const endDrag = (event: PointerEvent<HTMLDivElement>) => {
		if (drag.current?.pointerId !== event.pointerId) return;
		drag.current = null;
		setDragging(false);
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	};

	return (
		<div className="relative min-w-0 overflow-clip rounded-2xl bg-card">
			<div
				aria-describedby={instructionsId}
				aria-label="Relationship graph"
				className="relative h-[65dvh] min-h-90 touch-none overscroll-contain outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
				onClickCapture={(event) => {
					if (suppressClick.current && event.detail !== 0) {
						event.preventDefault();
						event.stopPropagation();
						suppressClick.current = false;
					}
				}}
				onDragStart={(event) => event.preventDefault()}
				onFocusCapture={(event) => {
					const target = event.target;
					if (
						!(target instanceof HTMLAnchorElement) ||
						!target.matches(":focus-visible")
					)
						return;
					const bounds = event.currentTarget.getBoundingClientRect();
					const node = target.getBoundingClientRect();
					if (
						node.left >= bounds.left &&
						node.right <= bounds.right &&
						node.top >= bounds.top &&
						node.bottom <= bounds.bottom
					)
						return;
					setView((current) =>
						panView(
							current,
							bounds.x + bounds.width / 2 - node.x - node.width / 2,
							bounds.y + bounds.height / 2 - node.y - node.height / 2,
						),
					);
				}}
				onKeyDown={(event) => {
					if (
						event.target !== event.currentTarget ||
						event.ctrlKey ||
						event.metaKey ||
						event.altKey
					)
						return;
					const step = event.shiftKey ? 160 : 64;
					const directions: Partial<Record<string, [number, number]>> = {
						ArrowLeft: [step, 0],
						ArrowRight: [-step, 0],
						ArrowUp: [0, step],
						ArrowDown: [0, -step],
					};
					const direction = directions[event.key];
					if (direction)
						setView((current) => panView(current, direction[0], direction[1]));
					else if (event.key === "+" || event.key === "=") zoomBy(1.2);
					else if (event.key === "-") zoomBy(1 / 1.2);
					else if (event.key === "Home") fitAll();
					else return;
					event.preventDefault();
				}}
				onLostPointerCapture={(event) => {
					if (event.target === event.currentTarget) endDrag(event);
				}}
				onPointerCancel={endDrag}
				onPointerDown={(event) => {
					if (!event.isPrimary || event.button !== 0) return;
					suppressClick.current = false;
					drag.current = {
						pointerId: event.pointerId,
						startX: event.clientX,
						startY: event.clientY,
						view,
						moved: false,
					};
					if (
						!(event.target instanceof Element) ||
						!event.target.closest("a")
					) {
						event.currentTarget.focus({ preventScroll: true });
					}
				}}
				onPointerLeave={(event) => {
					if (!drag.current?.moved) endDrag(event);
				}}
				onPointerMove={(event) => {
					const current = drag.current;
					if (!current || current.pointerId !== event.pointerId) return;
					const dx = event.clientX - current.startX;
					const dy = event.clientY - current.startY;
					if (!current.moved && Math.hypot(dx, dy) < 5) return;
					current.moved = true;
					suppressClick.current = true;
					// Capture only after movement so card clicks still navigate.
					event.currentTarget.setPointerCapture(event.pointerId);
					setDragging(true);
					setView(panView(current.view, dx, dy));
				}}
				onPointerUp={endDrag}
				ref={attachViewport}
				role="region"
				style={{
					cursor: dragging ? "grabbing" : "grab",
					backgroundImage:
						"radial-gradient(var(--color-border) 1px, transparent 1px)",
					backgroundSize: `${24 * view.zoom}px ${24 * view.zoom}px`,
					backgroundPosition: `calc(50% - ${view.x * view.zoom}px) calc(50% - ${view.y * view.zoom}px)`,
				}}
				tabIndex={0}
			>
				<div
					className="absolute top-1/2 left-1/2 origin-top-left"
					style={{
						width,
						height,
						transform: `scale(${view.zoom}) translate(${-view.x}px, ${-view.y}px)`,
					}}
				>
					{children}
				</div>
			</div>

			<p
				className="pointer-events-none absolute bottom-3 left-4 text-xs text-muted-foreground max-sm:hidden"
				id={instructionsId}
			>
				Drag to move · Scroll to zoom
				<span className="sr-only">
					. Use arrow keys to move, + and - to zoom, and Home to fit all.
				</span>
			</p>

			<div className="absolute top-3 right-3 flex items-center gap-0.5 rounded-xl bg-popover/90 p-1 shadow-pop backdrop-blur">
				<Button
					aria-label="Zoom out"
					disabled={view.zoom <= MIN_ZOOM}
					onClick={() => zoomBy(1 / 1.2)}
					size="icon-sm"
					variant="ghost"
				>
					<MinusIcon aria-hidden="true" />
				</Button>
				<span className="w-10 text-center text-xs font-medium tabular-nums">
					{Math.round(view.zoom * 100)}%
				</span>
				<Button
					aria-label="Zoom in"
					disabled={view.zoom >= MAX_ZOOM}
					onClick={() => zoomBy(1.2)}
					size="icon-sm"
					variant="ghost"
				>
					<PlusIcon aria-hidden="true" />
				</Button>
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								aria-label="Fit all"
								onClick={fitAll}
								size="icon-sm"
								variant="ghost"
							/>
						}
					>
						<MaximizeIcon aria-hidden="true" />
					</TooltipTrigger>
					<TooltipPopup>Fit all</TooltipPopup>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								aria-label="Centre on this party"
								disabled={!focus}
								onClick={centerParty}
								size="icon-sm"
								variant="ghost"
							/>
						}
					>
						<FocusIcon aria-hidden="true" />
					</TooltipTrigger>
					<TooltipPopup>Centre on this party</TooltipPopup>
				</Tooltip>
			</div>
		</div>
	);
}
