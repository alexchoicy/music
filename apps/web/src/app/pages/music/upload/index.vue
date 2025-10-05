<script setup lang="ts">
import { type Album } from '@music/api/type/music'
import { flattenAlbums, albumsSorter } from '~/lib/music/sortUtils';


const albums = ref<Album[]>([])
const fileObjects = ref<Map<string, { file: File, uploadHash: string }>>(new Map())
const blockUpload = ref(false)

async function reSortAlbums() {
    const allMusics = await flattenAlbums(albums.value);
    const sortedAlbums = await albumsSorter(allMusics);
    albums.value = sortedAlbums;
}

</script>



<template>
    <div class="w-full h-full flex-col p-6">
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
                            <Button class="w-full" :disable="blockUpload">Upload</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
</template>