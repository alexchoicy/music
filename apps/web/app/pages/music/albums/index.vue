<script setup lang="ts">
import type { AlbumDetailResponse, AlbumResponse } from '@music/api/dto/album.dto';
import type { Pagination } from '@music/api/type/pagination';

const { $backend } = useNuxtApp();

const { data: firstPage, error } = await useAsyncData<Pagination<AlbumResponse>>('albums-first-page', () =>
    $backend<Pagination<AlbumResponse>>('albums', {
        method: 'GET',
    })
)
const items = ref<AlbumResponse[]>([])
const cursor = ref<string | null>(null)
const hasNext = ref(false)
const loading = ref(false)

watchEffect(() => {
    const fp = firstPage.value
    if (fp && items.value.length === 0) {
        items.value = fp.items.slice()
        cursor.value = fp.cursor
        hasNext.value = fp.hasNext
    }
})

const apiBase = useRuntimeConfig().public.apiBase;

async function getAlbumInfo(albumID: string): Promise<AlbumDetailResponse> {
    return await $fetch<AlbumDetailResponse>(`${apiBase}/albums/${albumID}`, {
        method: 'GET',
    })
}

async function loadMore() {
    if (loading.value || !hasNext.value) return
    loading.value = true
    try {
        const next = await $fetch<Pagination<AlbumResponse>>(`${apiBase}/albums`, {
            method: 'GET',
            params: {
                cursor: cursor.value ?? undefined,
            },
        })
        items.value.push(...next.items)

        cursor.value = next.cursor
        hasNext.value = next.hasNext
    } catch (e) {
        console.error(e)
    } finally {
        loading.value = false
    }
}

</script>


<template>
    <Albums :items="items" :loading="loading" :hasNext="hasNext" @loadMore="loadMore" :getAlbumInfo="getAlbumInfo" />
</template>