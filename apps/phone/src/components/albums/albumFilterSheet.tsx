import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Sheet, SheetSection } from "@/components/ui/sheet";
import { SwitchRow } from "@/components/ui/switchRow";
import { albumTypes } from "@/lib/music";
import type { AlbumType } from "@/lib/schema";
import { albumQueries } from "@/queries/albums";

export type AlbumFilters = {
	types: AlbumType[];
	languageIds: string[];
	/** Lists only downloaded albums; on by default while offline. */
	downloadedOnly: boolean;
};

type AlbumFilterSheetProps = {
	open: boolean;
	filters: AlbumFilters;
	onChange: (filters: AlbumFilters) => void;
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
	onClose,
}: AlbumFilterSheetProps) {
	const languages = useQuery({
		...albumQueries.languages(),
		enabled: open && !filters.downloadedOnly,
	});

	return (
		<Sheet
			footer={
				<>
					<Button
						className="flex-1"
						onPress={() =>
							onChange({ types: [], languageIds: [], downloadedOnly: false })
						}
						variant="secondary"
					>
						Reset
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
			<SwitchRow
				description="Show only albums saved on this phone."
				label="Downloaded only"
				onChange={(downloadedOnly) => onChange({ ...filters, downloadedOnly })}
				value={filters.downloadedOnly}
			/>
			<SheetSection label="Type">
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
			</SheetSection>
			{/* Downloaded albums do not store track languages. */}
			{!filters.downloadedOnly && (
				<SheetSection label="Language">
					{languages.isPending ? (
						<Text className="text-sm text-muted-foreground">Loading…</Text>
					) : languages.isError ? (
						<Text className="text-sm text-destructive">
							Couldn't load languages.
						</Text>
					) : (
						<View className="flex-row flex-wrap gap-2">
							{languages.data.map((language) => {
								const id = String(language.id);
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
				</SheetSection>
			)}
		</Sheet>
	);
}
