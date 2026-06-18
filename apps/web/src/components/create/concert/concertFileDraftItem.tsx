import { useSortable } from "@dnd-kit/react/sortable";
import { GripVerticalIcon, Trash2Icon } from "lucide-react";
import { useId } from "react";

import { Button } from "#/components/coss/button";
import { Input } from "#/components/coss/input";
import {
	Select,
	SelectItem,
	SelectPopup,
	SelectTrigger,
	SelectValue,
} from "#/components/coss/select";
import { CONCERT_FILE_TYPE_OPTIONS } from "#/enums/concertEnums";
import { cn } from "#/lib/utils/styles";

import type { ConcertFileDraft, UpdateConcertFileDraftInput } from "./types";

type ConcertFileDraftItemProps = {
	file: ConcertFileDraft;
	index: number;
	onRemove: (id: string) => void;
	onUpdate: (id: string, input: UpdateConcertFileDraftInput) => void;
};

function ConcertFileTypeSelect({
	file,
	onUpdate,
}: Pick<ConcertFileDraftItemProps, "file" | "onUpdate">) {
	const selectedOption =
		CONCERT_FILE_TYPE_OPTIONS.find((option) => option.value === file.type) ??
		CONCERT_FILE_TYPE_OPTIONS[0];

	return (
		<Select
			items={CONCERT_FILE_TYPE_OPTIONS}
			onValueChange={(option) => {
				if (!option) return;
				onUpdate(file.id, { type: option.value });
			}}
			value={selectedOption}
		>
			<SelectTrigger aria-label={`Type for ${file.fileName}`} size="sm">
				<SelectValue />
			</SelectTrigger>
			<SelectPopup>
				{CONCERT_FILE_TYPE_OPTIONS.map((option) => (
					<SelectItem key={option.value} value={option}>
						{option.label}
					</SelectItem>
				))}
			</SelectPopup>
		</Select>
	);
}

export function ConcertFileDraftItem({
	file,
	index,
	onRemove,
	onUpdate,
}: ConcertFileDraftItemProps) {
	const titleId = useId();
	const { handleRef, isDragging, ref } = useSortable({
		group: "concert-files",
		id: file.id,
		index,
	});

	return (
		<div
			className={cn(
				"grid grid-cols-[2rem_minmax(0,1fr)_2rem] gap-3 p-3 transition-opacity md:grid-cols-[2rem_minmax(0,1fr)_12rem_2rem] md:grid-rows-[auto_auto] md:items-center md:px-4 md:py-3",
				isDragging && "opacity-50",
			)}
			ref={ref}
		>
			<Button
				aria-label={`Drag ${file.fileName}`}
				className="col-start-1 row-start-1 self-center md:row-span-2 md:row-start-1"
				ref={handleRef}
				size="icon-sm"
				variant="ghost"
			>
				<GripVerticalIcon aria-hidden="true" />
			</Button>

			<Input
				aria-label={`Title for ${file.fileName}`}
				className="col-start-2 row-start-1 md:col-start-2 md:row-start-1"
				id={titleId}
				onChange={(event) => {
					onUpdate(file.id, { title: event.target.value });
				}}
				size="sm"
				value={file.title}
			/>

			<div className="col-span-2 col-start-2 row-start-2 grid gap-1.5 md:col-span-1 md:col-start-3 md:row-start-1">
				<span className="text-xs font-medium text-muted-foreground md:hidden">
					Type
				</span>
				<ConcertFileTypeSelect file={file} onUpdate={onUpdate} />
			</div>

			<p className="col-span-2 col-start-2 row-start-3 min-w-0 self-center truncate text-xs font-medium text-muted-foreground md:col-span-1 md:col-start-2 md:row-start-2">
				{file.fileName}
			</p>

			<Button
				aria-label={`Remove ${file.fileName}`}
				className="col-start-3 row-start-1 self-center justify-self-end md:col-start-4 md:row-span-2 md:row-start-1"
				onClick={() => onRemove(file.id)}
				size="icon-sm"
				variant="ghost"
			>
				<Trash2Icon aria-hidden="true" />
			</Button>
		</div>
	);
}
