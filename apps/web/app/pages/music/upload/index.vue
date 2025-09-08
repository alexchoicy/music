<script setup lang="ts">
import UploadAlbumList from '@/components/music/uploads/uploadAlbumList.vue';
import { albumsSorter, flattenAlbums } from '@/lib/music/sorter';
import type { UploadMusicInitResponse } from '@music/api/dto/music.dto';
import { type Album } from '@music/api/type/music'

const albums = ref<Album[]>([])
const fileObjects = ref<Map<string, { file: File, uploadHash: string }>>(new Map())
const blockUpload = ref(false)

async function uploadAlbums() {
    blockUpload.value = true;
    const apiBase = useRuntimeConfig().public.apiBase;
    if (albums.value.length === 0) return;
    const response = await $fetch<UploadMusicInitResponse[]>(useRuntimeConfig().public.apiBase + '/uploads/musics/init', {
        method: 'POST',
        body: albums.value
    })

    if (!response) return;
    console.log(response)
    for (const uploadUrl of response) {
        const file = fileObjects.value.get(uploadUrl.trackHash);
        if (!file) continue;

        await fetch(uploadUrl.uploadUrl, {
            method: 'PUT',
            body: file.file,
            headers: {
                'Content-Type': 'audio/*',
                'content-md5': file.uploadHash
            }
        });
    }

    albums.value = [];
    fileObjects.value = new Map();
    blockUpload.value = false;
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
                    <MusicUploadsMusicUploader :albums="albums" :blockUpload="blockUpload" :fileObjects="fileObjects"
                        @update:blockUpload="blockUpload = $event" @update:albums="albums = $event" />
                </ClientOnly>

                <UploadAlbumList :albums="albums" class="mt-6" :blockUpload="blockUpload" :fileObjects="fileObjects"
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