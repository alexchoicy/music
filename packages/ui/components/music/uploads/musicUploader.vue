<script setup lang="ts">
import { type Album, type Disc, type Music } from '@music/api/type/music'
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-vue-next";
import { useDropZone } from '@vueuse/core';

import { parseBlob, type IAudioMetadata } from "music-metadata";
import { hashFileStream, covertToMusicObject, getNextFreeTrackNo, getAlbumHash, checkIfSoundtrack, hashFileStreamMd5 } from '@/lib/music/utils';
import { albumsSorter, flattenAlbums } from '@/lib/music/sorter';
import { ref } from 'vue';

const props = defineProps({
    albums: {
        type: Array as () => Album[],
        required: true,
    },
    blockUpload: {
        type: Boolean,
        default: false,
        required: true,
    },
    fileObjects: {
        type: Object as () => Map<string, { file: File, uploadHash: string }>,
        required: true,
    }
});

const dropZoneRef = ref<HTMLDivElement>();

function isAudio(types: readonly string[]) {
    return types.some(type => type.startsWith('audio/'));
}

useDropZone(dropZoneRef, {
    dataTypes: isAudio,
    onDrop: async (files) => {
        if (!files) return;
        await handleFiles(files as File[]);
    },
    multiple: true,
});

const emit = defineEmits(['update:blockUpload', 'update:albums']);

async function handleFiles(files: File[]) {
    if (props.blockUpload) return;
    emit('update:blockUpload', true);
    if (files.length === 0) {
        emit('update:blockUpload', false);
        return;
    }

    const musicObjects: Music[] = [];

    for (const file of files) {
        if (!file.type.startsWith('audio/')) {
            console.log(`Skipping non-audio file: ${file.name}`);
            continue;
        }
        const hash = await hashFileStream(file);

        const duplicate = props.albums.some(album =>
            album.disc.some((disc: Disc) => disc.musics.some((m: Music) => m.hash === hash))
        );
        if (duplicate) {
            console.log(`Duplicate file detected: ${file.name}, skipping...`);
            continue;
        }

        const metadata = await parseBlob(file);
        const uploadHash = await hashFileStreamMd5(file)

        const musicObj = covertToMusicObject(metadata, hash, uploadHash, file.name);

        props.fileObjects.set(hash, { file, uploadHash });
        musicObjects.push(musicObj);
    }

    if (musicObjects.length === 0) {
        emit('update:blockUpload', false);
        return;
    }

    const allMusics = (await flattenAlbums(props.albums)).concat(musicObjects);
    const sortedAlbums = await albumsSorter(allMusics);
    emit('update:albums', sortedAlbums);

    emit('update:blockUpload', false);
}


</script>

<template>
    <div class="xl:col-span-3 space-y-6">
        <div class="bg-sidebar rounded-lg border p-6">
            <div ref="dropZoneRef"
                class="border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 hover:bg-card/50"
                :class="blockUpload ? 'opacity-50 pointer-events-none' : ''">
                <div class="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload class="h-8 w-8 text-gray-400" />
                </div>
                <h3 class="text-xl font-semibold mb-2">Choose music files</h3>
                <p class="text-gray-400 mb-6">Drag and drop or browse to upload</p>
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
        </div>
    </div>
</template>