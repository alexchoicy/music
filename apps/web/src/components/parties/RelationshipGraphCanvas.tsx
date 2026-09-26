import { FocusIcon, MaximizeIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import type { PointerEvent, ReactNode } from "react";

import { Button } from "#/components/coss/button";

import { NODE_HEIGHT, NODE_WIDTH } from "./relationship-graph-layout";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2;
const clampZoom = (zoom: number) =>
	Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
// Graph coordinates at the center of the viewport.
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

export function RelationshipGraphCanvas({
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
	const [view, setView] = useState<View>(() => ({
		x: focus ? focus.x + NODE_WIDTH / 2 : width / 2,
		y: focus ? focus.y + NODE_HEIGHT / 2 : height / 2,
		zoom: 1,
	}));
	const [dragging, setDragging] = useState(false);
	const drag = useRef<{
		pointerId: number;
		startX: number;
		startY: number;
		view: View;
		moved: boolean;
	} | null>(null);
	const suppressClick = useRef(false);

	const attachViewport = useCallback((container: HTMLDivElement | null) => {
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
			container.style.height = `${Math.max(320, scrollViewport.clientHeight - top - 24)}px`;
		};
		const observer = new ResizeObserver(resize);
		if (scrollViewport) observer.observe(scrollViewport);
		if (container.previousElementSibling)
			observer.observe(container.previousElementSibling);
		resize();

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
		// React's passive wheel handler cannot prevent page scrolling or browser zoom.
		container.addEventListener("wheel", wheel, { passive: false });
		return () => {
			observer.disconnect();
			container.removeEventListener("wheel", wheel);
			viewport.current = null;
		};
	}, []);

	function fitAll() {
		const container = viewport.current;
		if (!container) return;
		setView({
			x: width / 2,
			y: height / 2,
			zoom: clampZoom(
				Math.min(
					1,
					container.clientWidth / width,
					container.clientHeight / height,
				),
			),
		});
	}

	function centerParty() {
		if (!focus) return;
		setView({
			x: focus.x + NODE_WIDTH / 2,
			y: focus.y + NODE_HEIGHT / 2,
			zoom: 1,
		});
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
		<div className="flex min-w-0 flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<p className="px-1 text-xs text-muted-foreground" id={instructionsId}>
					Drag to move · Scroll to zoom
					<span className="sr-only">
						. Use arrow keys to move, + and - to zoom, and Home to fit all.
					</span>
				</p>
				<div className="flex items-center gap-1">
					<Button
						aria-label="Zoom out"
						disabled={view.zoom <= MIN_ZOOM}
						onClick={() => zoomBy(1 / 1.2)}
						size="icon-sm"
						type="button"
						variant="ghost"
					>
						<MinusIcon aria-hidden="true" />
					</Button>
					<span className="w-11 text-center text-xs tabular-nums">
						{Math.round(view.zoom * 100)}%
					</span>
					<Button
						aria-label="Zoom in"
						disabled={view.zoom >= MAX_ZOOM}
						onClick={() => zoomBy(1.2)}
						size="icon-sm"
						type="button"
						variant="ghost"
					>
						<PlusIcon aria-hidden="true" />
					</Button>
					<Button onClick={fitAll} size="sm" type="button" variant="outline">
						<MaximizeIcon aria-hidden="true" />
						Fit all
					</Button>
					<Button
						disabled={!focus}
						onClick={centerParty}
						size="sm"
						type="button"
						variant="outline"
					>
						<FocusIcon aria-hidden="true" />
						Center party
					</Button>
				</div>
			</div>
			<div
				aria-describedby={instructionsId}
				aria-label="Relationship graph"
				className="relative h-[65dvh] min-h-80 touch-none overflow-clip overscroll-contain outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
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
				onClickCapture={(event) => {
					if (suppressClick.current && event.detail !== 0) {
						event.preventDefault();
						event.stopPropagation();
						suppressClick.current = false;
					}
				}}
				onDragStart={(event) => event.preventDefault()}
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
					if (direction) {
						setView((current) => panView(current, direction[0], direction[1]));
					} else if (event.key === "+" || event.key === "=") zoomBy(1.2);
					else if (event.key === "-") zoomBy(1 / 1.2);
					else if (event.key === "Home") fitAll();
					else return;
					event.preventDefault();
				}}
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
					// Capture only after movement so ordinary link clicks still navigate.
					if (
						!(event.target instanceof Element) ||
						!event.target.closest("a")
					) {
						event.currentTarget.focus({ preventScroll: true });
					}
				}}
				onPointerMove={(event) => {
					const current = drag.current;
					if (!current || current.pointerId !== event.pointerId) return;
					const dx = event.clientX - current.startX;
					const dy = event.clientY - current.startY;
					if (!current.moved && Math.hypot(dx, dy) < 5) return;
					current.moved = true;
					suppressClick.current = true;
					event.currentTarget.setPointerCapture(event.pointerId);
					setDragging(true);
					setView(panView(current.view, dx, dy));
				}}
				onPointerUp={endDrag}
				onPointerCancel={endDrag}
				onLostPointerCapture={(event) => {
					// Touch capture moves from the card to the canvas when dragging starts.
					if (event.target === event.currentTarget) endDrag(event);
				}}
				onPointerLeave={(event) => {
					if (!drag.current?.moved) endDrag(event);
				}}
				ref={attachViewport}
				role="region"
				style={{
					cursor: dragging ? "grabbing" : "grab",
					backgroundImage:
						"radial-gradient(var(--color-border) 1px, transparent 1px)",
					backgroundSize: `${20 * view.zoom}px ${20 * view.zoom}px`,
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
		</div>
	);
}
