<script setup lang="ts">
import { Disc3 } from 'lucide-vue-next';

import type { UploadAlbum } from "@music/api/type/music";
import { computed } from "vue";
import { checkIfUnsolvedFeat, checkIfVariousArtists } from '~/lib/music/uploadUtils';

const props = defineProps({
    album: {
        type: Object as () => UploadAlbum,
        required: true,
    },
    blockUpload: {
        type: Boolean,
        required: true,
    },
    onAlbumEditOpen: {
        type: Function,
        required: true,
    },

})

const isFeatUndetected = computed(() => {
    return checkIfUnsolvedFeat([props.album.albumArtist], props.album.name);
})

const isVariousArtists = computed(() => {
    return checkIfVariousArtists(props.album.albumArtist);
})
</script>


<template>
    <div class="flex items-center gap-4 w-full">
        <div class="w-16 h-16 rounded-lg flex flex-row item-center justify-center shrink-0">
            <img v-if="album.disc[0]!.musics?.[0]?.picture?.[0]?.data"
                v-bind:src="`data:${album.disc[0]!.musics?.[0]?.picture?.[0]?.format};base64,${album.disc[0]!.musics?.[0]?.picture?.[0]?.data}`"
                alt="Album Art" class="w-full h-full object-cover rounded-lg" />
            <div v-else class="w-full h-full bg-gray-700 flex items-center justify-center rounded-lg">
                <Disc3 class="h-8 w-8 text-gray-400" />
            </div>
        </div>
        <div class=" flex-1">
            <h2 class="text-lg font-semibold">{{ album.name }}
                <Badge
                    class="text-center dark:border-purple-500/50 dark:text-purple-300 border-purple-700/50 text-purple-500 text-xs px-1 py-0"
                    variant="secondary">
                    {{ album.albumType }}
                </Badge>
            </h2>
            <p class="text-gray-400">{{ album.albumArtist }}
                <Tooltip v-if="isFeatUndetected">
                    <TooltipTrigger as-child>
                        <Badge v-if="isFeatUndetected" class="text-xs px-1 py-0 mx-1" variant="destructive">
                            Feat not unsolved
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" class="max-w-xs">
                        <p>It seems that this track might contain a featured artist, but it was not solved. Please
                            adding the featured artist to the using track editor and remove the ft</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip v-if="isVariousArtists">
                    <TooltipTrigger as-child>
                        <Badge v-if="isVariousArtists" class="text-xs px-1 py-0 mx-1" variant="destructive">
                            Various Artists detected
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" class="max-w-xs">
                        <p>I suggest to not store the albums as Various Artists, change the main Artist name to this
                            albums's project name and mark it to "project".</p>
                    </TooltipContent>
                </Tooltip>
            </p>
            <div class="flex items-center gap-4 mt-1">
                <p class="text-sm text-gray-500">{{ album.NoOfTracks }} tracks</p>
                <p class="text-sm text-gray-500">{{ album.NoOfDiscs }} discs</p>
            </div>
        </div>
        <div>
            <Button variant="ghost" class="h-9 w-9 p-0" :disabled="props.blockUpload"
                @click="onAlbumEditOpen(album.hash)">
                <span class="text-xs">Edit</span>
            </Button>
        </div>
    </div>
</template>