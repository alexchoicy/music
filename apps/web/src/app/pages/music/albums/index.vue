<script setup lang="ts">
import AlbumCard from '~/components/music/albums/albumCard.vue';
import type { AlbumResponse } from '@music/api/dto/album.dto';

const albums = ref<AlbumResponse[]>([]);
const pending = ref(true);

onMounted(async () => {
    const data = await useNuxtApp().$backend<AlbumResponse[]>('albums');

    if (data) {
        albums.value.push(...data);
        pending.value = false;
    }

});
</script>

<template>

    <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <div v-if="pending" v-for="n in 12" :key="n"
            class="rounded-lg overflow-hidden bg-muted animate-pulse h-[260px]"></div>
        <AlbumCard v-else v-for="item in albums" :key="item.id" :album="item" />
    </div>
</template>