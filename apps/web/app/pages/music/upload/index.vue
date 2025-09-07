<script setup lang="ts">
import UploadAlbumList from '@/components/music/uploads/uploadAlbumList.vue';
import { albumsSorter, flattenAlbums } from '@/lib/music/sorter';
import { type Album } from '@music/api/type/music'

const albums = ref<Album[]>([])
const blockUpload = ref(false)

function uploadAlbums() {
    console.log(JSON.parse(JSON.stringify(albums.value)));
}

async function reSortAlbums() {
    const allMusics = await flattenAlbums(albums.value);
    const sortedAlbums = await albumsSorter(allMusics);
    albums.value = sortedAlbums;
}

</script>



<template>
    <div class="w-full h-full flex-col p-6">
        <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <div class="xl:col-span-3 space-y-6">
                <ClientOnly>
                    <MusicUploadsMusicUploader :albums="albums" :blockUpload="blockUpload"
                        @update:blockUpload="blockUpload = $event" @update:albums="albums = $event" />
                </ClientOnly>

                <UploadAlbumList :albums="albums" class="mt-6" :blockUpload="blockUpload"
                    @update:blockUpload="blockUpload = $event" :reSortAlbums="reSortAlbums" />
            </div>
            <div>
                <Card class="w-full">
                    <CardHeader>
                        Upload
                    </CardHeader>
                    <CardContent>
                        <div class="w-full">
                            <Button class="w-full" @click="uploadAlbums" :disabled="blockUpload">Upload</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>

</template>