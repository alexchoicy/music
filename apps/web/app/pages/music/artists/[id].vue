<script setup lang="ts">
import type { AlbumDetailResponse } from '@music/api/dto/album.dto';
import type { Artist } from '@music/api/dto/artist.dto';

const { $backend } = useNuxtApp();

const id = useRoute().params.id as string

const apiBase = useRuntimeConfig().public.apiBase;

async function getAlbumInfo(albumID: string): Promise<AlbumDetailResponse> {
    return await $fetch<AlbumDetailResponse>(`${apiBase}/albums/${albumID}`, {
        method: 'GET',
    })
}

const { data: album } = await useFetch<Artist>(`artists/${id}`, {
    $fetch: $backend
});

</script>

<template>
    <ArtistsArtistDetail v-if="album" :data="album" :getAlbumInfo="getAlbumInfo" />
</template>