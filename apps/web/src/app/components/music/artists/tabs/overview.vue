<script setup lang="ts">
import type { AlbumResponse, ArtistInfo } from '@music/api/dto/album.dto';

const props = defineProps({
    albumOnly: {
        type: Object as () => AlbumResponse[],
        required: true,
    },
    singleOnly: {
        type: Object as () => AlbumResponse[],
        required: true,
    },
    featuredInOnly: {
        type: Object as () => AlbumResponse[],
        required: true,
    },
    groupMember: {
        type: Object as () => ArtistInfo[],
        required: true,
    },
    relatedGroups: {
        type: Object as () => ArtistInfo[],
        required: true,
    },
    selectTab: {
        type: Function as PropType<(tabId: string) => void>,
        required: true,
    },
})
</script>

<template>
    <div class="w-full h-full pt-2">
        <div v-if="groupMember?.length > 0" class="mt-8 w-full">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-2xl font-semibold mb-4">Group Members</h2>
            </div>
            <div class="flex flex-row justify-center gap-4 flex-wrap p-3 ">
                <MusicArtistsArtistCard v-for="member in groupMember" :key="member.id" :artist="member"
                    class="h-[300px] w-[250px]" />
            </div>
        </div>
        <div v-if="albumOnly.length > 0" class="mt-8 w-full">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-2xl font-semibold mb-4">Albums</h2>
                <Button @click="selectTab('albums')">Get More</Button>
            </div>
            <div class="flex flex-row justify-center gap-4 flex-wrap overflow-hidden p-3 h-[410px]">
                <MusicAlbumsAlbumCard v-for="album in albumOnly" :key="album.id" :album="album"
                    class="h-[385px] w-[250px]" />
            </div>
        </div>
        <div v-if="singleOnly.length > 0" class="mt-8 w-full">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-2xl font-semibold mb-4">Single</h2>
                <Button @click="selectTab('single')">Get More</Button>
            </div>
            <div class="flex flex-row justify-center gap-4 flex-wrap overflow-hidden p-3 h-[410px]">
                <MusicAlbumsAlbumCard v-for="album in singleOnly" :key="album.id" :album="album"
                    class="h-[385px] w-[250px]" />
            </div>
        </div>
        <div v-if="relatedGroups?.length > 0" class="mt-8 w-full">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-2xl font-semibold mb-4">Related Groups</h2>
            </div>
            <div class="flex flex-row justify-center gap-4 flex-wrap p-3 ">
                <MusicArtistsArtistCard v-for="member in relatedGroups" :key="member.id" :artist="member"
                    class="h-[300px] w-[250px]" />
            </div>
        </div>
        <div v-if="featuredInOnly.length > 0" class="mt-8 w-full">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-2xl font-semibold mb-4">Featured In</h2>
                <Button @click="selectTab('featuredIn')">Get More</Button>
            </div>
            <div class="flex flex-row justify-center gap-4 flex-wrap overflow-hidden p-3 h-[410px]">
                <MusicAlbumsAlbumCard v-for="album in featuredInOnly" :key="album.id" :album="album"
                    class="h-[385px] w-[250px]" />
            </div>
        </div>
    </div>
</template>