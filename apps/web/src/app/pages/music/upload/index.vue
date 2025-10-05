<script setup lang="ts">
import { type UploadAlbum } from '@music/api/type/music'
import { type UploadMusicInitResponse } from '@music/api/dto/upload.dto'
import { flattenAlbums, albumsSorter } from '~/lib/music/sortUtils';
import { toast } from 'vue-sonner';


const albums = ref<UploadAlbum[]>([])
const fileObjects = ref<Map<string, { file: File, uploadHash: string }>>(new Map())
const blockUpload = ref(false)

async function reSortAlbums() {
    const allMusics = await flattenAlbums(albums.value);
    const sortedAlbums = await albumsSorter(allMusics);
    albums.value = sortedAlbums;
}

async function uploadAlbums() {
    blockUpload.value = true;
    if (albums.value.length === 0) return;
    let response: UploadMusicInitResponse[] | null = null;

    try {
        response = await useNuxtApp().$backend<UploadMusicInitResponse[]>('/uploads/musics/init', {
            method: 'POST',
            body: albums.value,
        })

    } catch (error) {
        console.error(error);
        toast.error('Failed to initialize upload. Please try again.');
        blockUpload.value = false;
        return
    }

    for (const uploadUrl of response) {
        const file = fileObjects.value.get(uploadUrl.trackHash);
        if (!file) continue;

        await fetch(uploadUrl.uploadUrl, {
            method: 'PUT',
            body: file.file,
            credentials: 'include',
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

</script>



<template>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="md:col-span-3 space-y-6">
            <MusicUploadArea :blockUpload="blockUpload" :albums="albums" :fileObjects="fileObjects"
                @update:blockUpload="blockUpload = $event" @update:albums="albums = $event" />
            <MusicUploadAlbumList :albums="albums" :blockUpload="blockUpload" :fileObjects="fileObjects"
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
</template>