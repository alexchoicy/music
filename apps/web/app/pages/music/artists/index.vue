<script setup lang="ts">
import Artists from '@/components/artists/artists.vue';
import type { ArtistSchema } from '@music/api/dto/album.dto';
import type { Pagination } from '@music/api/type/pagination';

const { $backend } = useNuxtApp();

const { data: firstPage, error } = await useAsyncData<Pagination<ArtistSchema>>('artists-first-page', () =>
    $backend<Pagination<ArtistSchema>>('artists', {
        method: 'GET',
    })
)
const items = ref<ArtistSchema[]>([])
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

async function loadMore() {
    if (loading.value || !hasNext.value) return
    loading.value = true
    try {
        const next = await $fetch<Pagination<ArtistSchema>>(`${apiBase}/artists`, {
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
    <Artists :items="items" :loading="loading" :hasNext="hasNext" :onLoadMore="loadMore" />
</template>