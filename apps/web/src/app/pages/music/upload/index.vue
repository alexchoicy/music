<script setup lang="ts">
import { type UploadAlbum } from '@music/api/type/music'
import { type UploadMusicInitResponse } from '@music/api/dto/upload.dto'
import { flattenAlbums, albumsSorter } from '~/lib/music/sortUtils';
import { toast } from 'vue-sonner';
import pLimit from 'p-limit';

const albums = ref<UploadAlbum[]>([])
const fileObjects = ref<Map<string, { file: File, uploadHash: string }>>(new Map())
const blockUpload = ref(false)

const uploaded = ref(0);
const total = ref(0);

async function reSortAlbums() {
    const allMusics = await flattenAlbums(albums.value);
    const sortedAlbums = await albumsSorter(allMusics);
    albums.value = sortedAlbums;
}

async function uploadAlbums() {
    if (albums.value.length === 0) return;
    uploaded.value = 0;
    blockUpload.value = true;
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

    const limit = pLimit(5);

    total.value = response.length;

    const promises = response.map((uploadUrl) => limit(() => {
        const file = fileObjects.value.get(uploadUrl.trackHash);
        if (!file) return;

        return fetch(uploadUrl.uploadUrl, {
            method: 'PUT',
            body: file.file,
            credentials: 'include',
            headers: {
                'Content-Type': 'audio/*',
                'content-md5': file.uploadHash
            }
        }).then(res => {
            if (!res.ok) {
                throw new Error(`Failed to upload file: ${file.file.name}`);
            }
            uploaded.value += 1;
        }).catch(err => {
            console.error(err);
            toast.error(`Failed to upload file: ${file.file.name}`);
        });
    }));

    await Promise.all(promises);

    toast.success(`Successfully uploaded ${uploaded.value} / ${total.value} files.`);

    uploaded.value = 0;
    total.value = 0;
    albums.value = [];
    fileObjects.value = new Map();
    blockUpload.value = false;
}

const percentage = computed(() => {
    return total.value === 0 ? 0 : Math.round((uploaded.value / total.value) * 100);
});
</script>



<template>
    <Loading v-if="blockUpload" :percentage="percentage" />
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="md:col-span-3 space-y-6">
            <MusicUploadArea :blockUpload="blockUpload" :albums="albums" :fileObjects="fileObjects" :uploaded="uploaded"
                @update:blockUpload="blockUpload = $event" @update:albums="albums = $event"
                @update:total="total = $event" @update:uploaded="uploaded = $event" />
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