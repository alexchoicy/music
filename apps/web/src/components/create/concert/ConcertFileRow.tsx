import { useSortable } from "@dnd-kit/react/sortable";
import { GripVerticalIcon, Trash2Icon } from "lucide-react";
import { useId } from "react";

import { Button } from "#/components/base/button";
import { Field, FieldLabel } from "#/components/base/field";
import { Input } from "#/components/base/input";
import { FilterSelect } from "#/components/library/FilterSelect";
import { MEDIA_SOURCE_OPTIONS } from "#/enums/albumEnums";
import { CONCERT_FILE_TYPE_OPTIONS } from "#/enums/concertEnums";
import { cn } from "#/lib/utils/styles";
import type {
	ConcertFileDraft,
	UpdateConcertFileDraftInput,
} from "#/store/concertUploadStoreType";

type ConcertFileRowProps = {
	disabled: boolean;
	file: ConcertFileDraft;
	index: number;
	onRemove: (id: string) => void;
	onUpdate: (id: string, input: UpdateConcertFileDraftInput) => void;
};

export function ConcertFileRow({
	disabled,
	file,
	index,
	onRemove,
	onUpdate,
}: ConcertFileRowProps) {
	const sourceUrlId = useId();
	const { handleRef, isDragging, ref } = useSortable({
		group: "concert-files",
		id: file.id,
		index,
		disabled,
	});

	return (
		<div
			className={cn(
				"grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-start gap-3 px-3 py-3 transition-opacity",
				isDragging && "opacity-50",
			)}
			ref={ref}
		>
			<Button
				aria-label={`Drag ${file.fileName}`}
				disabled={disabled}
				ref={handleRef}
				size="icon-sm"
				variant="ghost"
			>
				<GripVerticalIcon aria-hidden="true" />
			</Button>

			<div className="grid min-w-0 gap-3">
				<div className="grid min-w-0 gap-1">
					<Input
						aria-label={`Title for ${file.fileName}`}
						disabled={disabled}
						onChange={(event) =>
							onUpdate(file.id, { title: event.target.value })
						}
						size="sm"
						value={file.title}
					/>
					<span className="truncate text-xs text-muted-foreground">
						{file.fileName}
					</span>
				</div>

				<div className="grid gap-3 sm:grid-cols-2">
					<FilterSelect
						label="Type"
						onValueChange={(type) => onUpdate(file.id, { type })}
						options={CONCERT_FILE_TYPE_OPTIONS}
						value={file.type}
					/>
					<FilterSelect
						label="Source"
						onValueChange={(source) => onUpdate(file.id, { source })}
						options={MEDIA_SOURCE_OPTIONS}
						value={file.source}
					/>
					<Field className="sm:col-span-2">
						<FieldLabel htmlFor={sourceUrlId}>Source URL</FieldLabel>
						<Input
							autoComplete="off"
							disabled={disabled}
							id={sourceUrlId}
							onChange={(event) =>
								onUpdate(file.id, { sourceUrl: event.target.value })
							}
							placeholder="Optional"
							type="url"
							value={file.sourceUrl}
						/>
					</Field>
				</div>
			</div>

			<Button
				aria-label={`Remove ${file.fileName}`}
				disabled={disabled}
				onClick={() => onRemove(file.id)}
				size="icon-sm"
				title="Remove"
				variant="ghost"
			>
				<Trash2Icon aria-hidden="true" />
			</Button>
		</div>
	);
}
