<script setup lang="ts">
import type { AlbumResponse } from '@music/api/dto/album.dto';

const props = defineProps({
    albums: {
        type: Object as () => AlbumResponse[],
        required: true,
    },
})
</script>

<template>
    <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <music-albums-album-card v-for="item in albums" :key="item.id" :album="item" />
    </div>
</template>
