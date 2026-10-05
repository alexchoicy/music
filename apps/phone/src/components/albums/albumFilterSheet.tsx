import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import type { AlbumType } from "@/lib/album";
import { albumTypes } from "@/lib/album";
import { languageQueries } from "@/lib/queries/language.queries";

export type AlbumFilters = {
	types: AlbumType[];
	languageIds: number[];
};

type AlbumFilterSheetProps = {
	open: boolean;
	filters: AlbumFilters;
	onChange: (filters: AlbumFilters) => void;
	/** Lists only downloaded albums; on by default while offline. */
	downloadedOnly: boolean;
	onDownloadedOnlyChange: (downloadedOnly: boolean) => void;
	onClose: () => void;
};

function toggle<T>(values: T[], value: T) {
	return values.includes(value)
		? values.filter((item) => item !== value)
		: [...values, value];
}

export function AlbumFilterSheet({
	open,
	filters,
	onChange,
	downloadedOnly,
	onDownloadedOnlyChange,
	onClose,
}: AlbumFilterSheetProps) {
	const languages = useQuery({
		...languageQueries.getLanguages(),
		enabled: open && !downloadedOnly,
	});

	return (
		<Sheet
			footer={
				<>
					<Button
						className="flex-1"
						onPress={() => {
							onChange({ types: [], languageIds: [] });
							onDownloadedOnlyChange(false);
						}}
						variant="outline"
					>
						Clear
					</Button>
					<Button className="flex-1" onPress={onClose}>
						Done
					</Button>
				</>
			}
			onClose={onClose}
			open={open}
			title="Filter albums"
		>
			<View className="gap-2.5">
				<Text className="text-sm font-medium text-muted-foreground">
					Library
				</Text>
				<View className="flex-row flex-wrap gap-2">
					<Chip
						label="Downloaded only"
						onPress={() => onDownloadedOnlyChange(!downloadedOnly)}
						selected={downloadedOnly}
					/>
				</View>
			</View>
			<View className="gap-2.5">
				<Text className="text-sm font-medium text-muted-foreground">Type</Text>
				<View className="flex-row flex-wrap gap-2">
					{albumTypes.map((type) => (
						<Chip
							key={type}
							label={type}
							onPress={() =>
								onChange({ ...filters, types: toggle(filters.types, type) })
							}
							selected={filters.types.includes(type)}
						/>
					))}
				</View>
			</View>
			{/* Downloaded albums do not store track languages. */}
			{!downloadedOnly && (
				<View className="gap-2.5">
					<Text className="text-sm font-medium text-muted-foreground">
						Language
					</Text>
					{languages.isPending ? (
						<Text className="text-sm text-muted-foreground">Loading…</Text>
					) : languages.isError ? (
						<Text className="text-sm text-destructive">
							Unable to load languages
						</Text>
					) : (
						<View className="flex-row flex-wrap gap-2">
							{languages.data.map((language) => {
								const id = Number(language.id);
								return (
									<Chip
										key={id}
										label={language.language}
										onPress={() =>
											onChange({
												...filters,
												languageIds: toggle(filters.languageIds, id),
											})
										}
										selected={filters.languageIds.includes(id)}
									/>
								);
							})}
						</View>
					)}
				</View>
			)}
		</Sheet>
	);
}
