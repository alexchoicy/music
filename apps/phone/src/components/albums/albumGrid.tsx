import type { ReactElement } from "react";
import { FlatList, View } from "react-native";

import { AlbumCard } from "@/components/albums/albumCard";
import { gridGap, gridPadding, useGrid } from "@/lib/hooks";
import type { AlbumTile } from "@/lib/music";
import { useEndPadding } from "@/store/miniPlayerStore";

type AlbumGridProps = {
	albums: AlbumTile[];
	header?: ReactElement;
	/** Shown in place of the grid when there are no albums. */
	empty?: ReactElement;
	onRefresh?: () => void;
	refreshing?: boolean;
};

export function AlbumGrid({
	albums,
	header,
	empty,
	onRefresh,
	refreshing = false,
}: AlbumGridProps) {
	const { columns, itemWidth } = useGrid(150);
	const endPadding = useEndPadding(24);

	return (
		<FlatList
			columnWrapperStyle={{ gap: gridGap }}
			contentContainerStyle={{
				flexGrow: 1,
				gap: 20,
				paddingHorizontal: gridPadding,
				paddingBottom: endPadding,
			}}
			data={albums}
			keyboardDismissMode="on-drag"
			keyboardShouldPersistTaps="handled"
			keyExtractor={(album) => album.albumId}
			// FlatList cannot change its column count, so it remounts instead.
			key={columns}
			ListEmptyComponent={empty}
			ListHeaderComponent={header}
			numColumns={columns}
			onRefresh={onRefresh}
			refreshing={refreshing}
			renderItem={({ item }) => (
				<View style={{ width: itemWidth }}>
					<AlbumCard album={item} />
				</View>
			)}
		/>
	);
}
