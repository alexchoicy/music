<script setup lang="ts">
import { User } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { nextTick, ref } from 'vue';
import { Artist } from '@music/api/dto/artist.dto';
import { AlbumDetailResponse } from '@music/api/dto/album.dto';
import ArtistAlbum from './artistAlbum.vue';
import ArtistOverall from './artistOverall.vue';

const props = defineProps<{
    data: Artist
    getAlbumInfo: (albumID: string) => Promise<AlbumDetailResponse>

}>();

const tab = [
    { name: 'Overview', id: 'overview' },
    { name: 'Albums', id: 'albums' },
    { name: 'Single', id: 'single' },
]

const currentTab = ref('overview');

const selectTab = (tabId: string) => {
    currentTab.value = tabId;
    nextTick(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
};

const albumOnly = props.data.albums.filter(album => album.albumType === 'Album');
const singleOnly = props.data.albums.filter(album => album.albumType === 'Single');

</script>

<template>
    <div class="w-full h-full">
        <div class="relative h-80">
            <div class="absolute inset-0 bg-cover bg-center opacity-30"
                :style="`background-image: url('${data.albums[0].cover}')`" />
            <div class="relative h-full flex items-end">
                <div class="container mx-auto px-6 pb-8">
                    <div class="flex items-end gap-6">
                        <img v-if="data.image" :src="data.image" alt="Artist Image"
                            class="w-48 h-48 object-cover rounded-full border-4 border-background shadow-xl" />
                        <div v-else
                            class="w-48 h-48 flex items-center justify-center bg-muted rounded-full border-4 border-background shadow-xl">
                            <User class="w-40 h-40 text-gray-400" />
                        </div>
                        <div class="pb-4">
                            <h1 className="text-5xl font-bold mb-2 text-balance">{{ data.name }}</h1>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="sticky top-16 z-2 bg-background h-15">
            <div class="flex gap-8 border-b h-full px-2">
                <Button @click="selectTab(tabItem.id)"
                    class=" text-sm font-medium transition-colors relative rounded-none h-full cursor-pointer"
                    v-for="tabItem in tab" :key="tabItem.id" :class="{ 'text-primary': currentTab === tabItem.id }"
                    variant="ghost">
                    {{ tabItem.name }}
                    <div v-if="currentTab === tabItem.id" class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                </Button>
            </div>
        </div>

        <div class="p-10 w-full h-full">
            <ArtistOverall v-if="currentTab === 'overview'" :albumOnly="albumOnly.slice(0, 6)"
                :singleOnly="singleOnly.slice(0, 6)" :getAlbumInfo="getAlbumInfo" :selectTab="selectTab" />
            <ArtistAlbum v-else-if="currentTab === 'albums'" :album="albumOnly" :getAlbumInfo="getAlbumInfo" />
            <ArtistAlbum v-else-if="currentTab === 'single'" :album="singleOnly" :getAlbumInfo="getAlbumInfo" />

        </div>
    </div>
</template>