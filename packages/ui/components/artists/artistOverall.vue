<script setup lang="ts">
import { AlbumDetailResponse, AlbumResponse } from '@music/api/dto/album.dto';
import { PropType } from 'vue';
import { Button } from '@/components/ui/button';

import AlbumCard from '@/components/albums/albumCard.vue';

const props = defineProps({
    albumOnly: {
        type: Object as () => AlbumResponse[],
        required: true,
    },
    singleOnly: {
        type: Object as () => AlbumResponse[],
        required: true,
    },
    getAlbumInfo: {
        type: Function as PropType<(albumID: string) => Promise<AlbumDetailResponse>>,
        required: true,
    },
    selectTab: {
        type: Function as PropType<(tabId: string) => void>,
        required: true,
    },
});


</script>

<template>
    <div class="w-full h-full">
        <div v-if="albumOnly.length" class="mt-8 w-full">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-2xl font-semibold mb-4">Albums</h2>
                <Button @click="selectTab('albums')">Get More</Button>
            </div>
            <div class="flex flex-row gap-x-4 flex-wrap overflow-hidden p-3 h-[385px]">
                <AlbumCard v-for="item in props.albumOnly" :key="item.id" :album="item"
                    :getAlbumInfo="props.getAlbumInfo" class="min-w-64 max-w-64" />
            </div>
        </div>
        <div v-if="singleOnly.length" class="mt-8 w-full">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-2xl font-semibold mb-4">Singles</h2>
                <Button @click="selectTab('single')">Get More</Button>
            </div>
            <div class="flex flex-row gap-x-4 flex-wrap overflow-hidden p-3 h-[385px]">
                <AlbumCard v-for="item in props.singleOnly" :key="item.id" :album="item"
                    :getAlbumInfo="props.getAlbumInfo" class="min-w-64 max-w-64" />
            </div>
        </div>
    </div>
</template>