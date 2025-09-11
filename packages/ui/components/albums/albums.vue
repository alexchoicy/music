<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import AlbumCard from './albumCard.vue'
import type { AlbumDetailResponse, AlbumResponse } from '@music/api/dto/album.dto'

const props = defineProps<{
    items: AlbumResponse[]
    loading: boolean
    hasNext: boolean
    getAlbumInfo: (albumID: string) => Promise<AlbumDetailResponse>
}>()

const emit = defineEmits<{
    (e: 'loadMore'): void
}>()

const showGrid = computed(() => !props.loading && props.items?.length > 0)

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const isSentinelVisible = ref(false)

function setupObserver() {
    if (!sentinel.value) return
    observer?.disconnect()
    observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.target !== sentinel.value) return
            isSentinelVisible.value = entry.isIntersecting
        })
    }, {
        rootMargin: '200px',
    })
    observer.observe(sentinel.value)
}
watch(
    () => [props.loading, props.hasNext, isSentinelVisible.value],
    () => {
        if (isSentinelVisible.value && !props.loading && props.hasNext) {
            emit('loadMore')
        }
    }
)
onMounted(() => {
    setupObserver()
})

onBeforeUnmount(() => {
    observer?.disconnect()
})



</script>

<template>
    <div class="w-full min-h-screen p-6 pb-10">
        <header class="mb-8">
            <h1 class="text-4xl font-bold text-foreground mb-2">Albums</h1>
            <p class="text-muted-foreground text-lg">Discover new albums</p>
        </header>
        <div v-if="showGrid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            <AlbumCard v-for="item in props.items" :key="item.id" :album="item" :getAlbumInfo="props.getAlbumInfo" />
        </div>
        <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            <div v-for="n in 12" :key="n" class="rounded-lg overflow-hidden bg-muted animate-pulse h-[260px]"></div>
        </div>

        <div ref="sentinel" class=""></div>
    </div>
</template>