<script setup lang="ts">
import type { ArtistSchema } from '@music/api/dto/album.dto';
import ArtistCard from '~/components/music/artists/artistCard.vue';

const artists = ref<ArtistSchema[]>([]);
const pending = ref(true);

onMounted(async () => {
    const data = await useNuxtApp().$backend<ArtistSchema[]>('artists');

    if (data) {
        artists.value.push(...data);
        pending.value = false;
    }

});
</script>

<template>
    <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <div v-if="pending" v-for="n in 12" :key="n"
            class="rounded-lg overflow-hidden bg-muted animate-pulse h-[260px]"></div>
        <ArtistCard v-else v-for="item in artists" :key="item.id" :artist="item" />
    </div>
</template>