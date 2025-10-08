<script setup lang="ts">
import type { UploadAlbum, UploadDisc, UploadMusic } from '@music/api/type/music'
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-vue-next";
import { useDropZone } from '@vueuse/core';

import { parseBlob } from "music-metadata";
import { ref } from 'vue';
import { hashFileStream, hashFileStreamMd5, covertToMusicObject } from '~/lib/music/uploadUtils';
import { flattenAlbums, albumsSorter } from '~/lib/music/sortUtils';
import Skeleton from '~/components/ui/skeleton/Skeleton.vue';

import pLimit from 'p-limit';

const props = defineProps({
    albums: {
        type: Array as () => UploadAlbum[],
        required: true,
    },
    blockUpload: {
        type: Boolean,
        required: true,
    },
    fileObjects: {
        type: Object as () => Map<string, { file: File, uploadHash: string }>,
        required: true,
    }
});
const emit = defineEmits(['update:blockUpload', 'update:albums', 'update:total', 'update:uploaded']);

const dropZoneRef = ref<HTMLDivElement>();

function isAudio(types: readonly string[]) {
    return types.some(type => type.startsWith('audio/'));
}

useDropZone(dropZoneRef, {
    dataTypes: isAudio,
    onDrop: async (files) => {
        if (!files) return;
        await handleFiles(files);
    },
    multiple: true,
});

async function handleFiles(files: File[]) {
    if (props.blockUpload) return;
    emit('update:blockUpload', true);
    try {
        const audioFiles = files.filter(f => f.type?.startsWith('audio/'));
        if (audioFiles.length === 0) {
            emit('update:total', 0);
            emit('update:uploaded', 0);
            return;
        }

        emit('update:total', audioFiles.length);
        emit('update:uploaded', 0);

        const limit = pLimit(3);
        let processed = 0;
        const seenInBatch = new Set<string>();

        const tasks = audioFiles.map(file => limit(async () => {
            try {
                const hash = await hashFileStream(file);
                if (seenInBatch.has(hash)) {
                    return null;
                }
                seenInBatch.add(hash);

                const isDupInLibrary = props.albums.some(album =>
                    album.disc.some((disc: UploadDisc) =>
                        disc.musics.some((m: UploadMusic) => m.hash === hash)
                    )
                );
                if (isDupInLibrary) {
                    return null;
                }
                //maybe only load Image once later?
                const metadata = await parseBlob(file);
                const uploadHash = await hashFileStreamMd5(file);
                const musicObj = covertToMusicObject(metadata, hash, uploadHash, file.name);

                props.fileObjects.set(hash, { file, uploadHash });
                return musicObj;
            } finally {
                processed += 1;
                emit('update:uploaded', processed);
            }
        }));

        const results = await Promise.all(tasks);
        const musicObjects = results.filter((x): x is UploadMusic => x != null);

        if (musicObjects.length > 0) {
            const allMusics = (await flattenAlbums(props.albums)).concat(musicObjects);
            const sortedAlbums = await albumsSorter(allMusics);
            emit('update:albums', sortedAlbums);
        }
    } finally {
        emit('update:blockUpload', false);
    }
}

</script>

<template>
    <div class="xl:col-span-3 space-y-6">
        <div class="bg-sidebar rounded-lg border p-6">
            <ClientOnly>
                <div ref="dropZoneRef"
                    class="border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 hover:bg-card/50"
                    :class="blockUpload ? 'opacity-50 pointer-events-none' : ''">
                    <div class="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Upload class="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 class="text-xl font-semibold mb-2">Choose music files</h3>
                    <p class="text-gray-400 mb-6">Drag and drop or browse to upload (Not support Folder)</p>
                    <Input type="file" multiple accept="audio/*" class="hidden" id="file-upload" @change="(e: Event) => {
                        const files = (e.target as HTMLInputElement).files;
                        if (files) handleFiles(Array.from(files));
                    }" />
                    <Button asChild class="font-semibold">
                        <Label htmlFor="file-upload" class="cursor-pointer">
                            Browse Files
                        </Label>
                    </Button>
                </div>
                <template #fallback>
                    <Skeleton class="h-48 w-full" />
                </template>
            </ClientOnly>
        </div>
    </div>
</template>