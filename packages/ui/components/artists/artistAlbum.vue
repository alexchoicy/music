<script setup lang="ts">
import { AlbumDetailResponse, AlbumResponse } from '@music/api/dto/album.dto';
import { PropType } from 'vue';

import AlbumCard from '@/components/albums/albumCard.vue';

const props = defineProps({
    album: {
        type: Object as () => AlbumResponse[],
        required: true,
    },
    getAlbumInfo: {
        type: Function as PropType<(albumID: string) => Promise<AlbumDetailResponse>>,
        required: true,
    }
});

</script>

<template>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        <AlbumCard v-for="item in props.album" :key="item.id" :album="item" :getAlbumInfo="props.getAlbumInfo" />
    </div>
</template>