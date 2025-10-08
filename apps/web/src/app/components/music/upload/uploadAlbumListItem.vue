<script setup lang="ts">
import { X } from 'lucide-vue-next';

import type { UploadAlbum, UploadMusic } from "@music/api/type/music";
import { computed } from "vue";
import { getSecondToMinuteString } from "~/lib/music/display";
import { checkIfUnsolvedFeat } from '~/lib/music/uploadUtils';
const props = defineProps({
    album: {
        type: Object as () => UploadAlbum,
        required: true,
    },
    track: {
        type: Object as () => UploadMusic,
        required: true,
    },
    blockUpload: {
        type: Boolean,
        required: true,
    },
    trackRemover: {
        type: Function,
        required: true,
    },
    onTrackEditOpen: {
        type: Function,
        required: true,
    }
})

const isFeatUndetected = computed(() => {
    return checkIfUnsolvedFeat(props.track.artists, props.track.title);
})

</script>


<template>
    <div class="px-4 py-1 transition-colors group">
        <div class="flex items-center gap-4">
            <div class="w-8 text-center">
                <span class="text-sm">{{ track.track.no }}</span>
            </div>
            <div class="flex-1 min-w-0">
                <h3 class="font-medium text-sm truncate" :title="track.title">{{
                    track.title }}
                    <Badge v-if="track.isInstrumental"
                        class="dark:border-purple-500/50 dark:text-purple-300 border-purple-700/50 text-purple-500 text-xs px-1 py-0"
                        variant="secondary">
                        Instrumental
                    </Badge>
                    <Badge v-if="track.isMC"
                        class="dark:border-purple-500/50 dark:text-purple-300 border-purple-700/50 text-purple-500 text-xs px-1 py-0"
                        variant="secondary">
                        MC
                    </Badge>
                </h3>
                <div class="text-xs text-gray-400">
                    <span v-for="(artist, index) in track.artists" class="" :key="`${track.hash}-${index}`">
                        {{ artist }}<span v-if="!(index === track.artists.length - 1)">, </span>
                    </span>
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
                </div>
            </div>
            <div class="w-20 text-center">
                <span class="text-sm text-gray-400">{{ getSecondToMinuteString(track.duration)
                }}</span>
            </div>
            <div class="w-20 flex text-center justify-end gap-1 ">
                <Button variant="ghost" class="h-9 w-9 p-0" :disabled="props.blockUpload"
                    @click="onTrackEditOpen(album.hash, track.hash)">
                    <span class="text-xs">Edit</span>
                </Button>
                <Button variant="ghost" class="h-9 w-9 p-0 hover:bg-red-900/20 hover:text-red-400"
                    :disabled="props.blockUpload" @click="trackRemover(album.hash, track.hash)">
                    <X class="h-4 w-4" />
                </Button>
            </div>
        </div>
    </div>
</template>