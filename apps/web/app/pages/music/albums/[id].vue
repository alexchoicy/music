<script setup lang="ts">
import type { AlbumDetailResponse } from '@music/api/dto/album.dto';

const { $backend } = useNuxtApp();

const id = useRoute().params.id as string

const { data: album } = await useFetch<AlbumDetailResponse>(`albums/${id}`, {
    $fetch: $backend
})
</script>

<template>
    <AlbumsAlbumDetail v-if="album" :album="album" />
</template>