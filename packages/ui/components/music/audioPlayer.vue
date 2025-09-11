<script setup lang="ts">
import { AudioLines, Heart, ListMusic, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Volume, Volume1, Volume2, VolumeOff } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { useAudioEntity, useAudioPlayerStore } from '~/stores/audioPlayer';
import type { Playlist } from '~/types/playlist';
import { storeToRefs } from 'pinia';

const player = useAudioPlayerStore();
const audioEntity = useAudioEntity();

const { playing, currentTrack, preferredQuality } = storeToRefs(player)
const audioElement = ref<HTMLAudioElement>();

onMounted(() => {
    console.log('Audio Element:', audioElement.value?.currentTime);
    audioElement.value?.addEventListener('ended', () => {
        console.log('Audio ended');
        player.setPlaying(false);
    });
})


function togglePlay() {
    player.setPlaying(!player.playing);
}

function setCurrentTrackSrc() {
    if (!currentTrack.value) return '';
    const url = currentTrack.value.quality.find(q => q.type === preferredQuality.value)?.url || currentTrack.value.quality[0]?.url || '';
    if (!url) {
        console.warn('No URL found for current track');
        return '';
    }
    return url + '/stream';
}

watch(() => player.playing, (newVal) => {
    if (!audioElement.value) return;
    if (newVal) {
        if (player.currentTime === 0) {
            const src = setCurrentTrackSrc();
            if (!src) return;
            audioElement.value.src = src;
        }
        audioElement.value.play();
    } else {
        audioElement.value.pause();
    }
});

watch([currentTrack, preferredQuality], () => {
    if (!audioElement.value) return;
    const src = setCurrentTrackSrc();
    if (!src) return;
    if (playing.value) {
        audioElement.value.src = src;
        audioElement.value.play();
    }
}, { immediate: true });



</script>

<template>
    <div class="p-4 flex flex-row items-center gap-4 border-t sticky bottom-0 bg-background">
        <div class="flex flex-row">
            <Button @click="togglePlay" variant="ghost">
                <Play v-if="!player.playing" />
                <Pause v-else />
            </Button>
        </div>
        <audio ref="audioElement" controls hidden></audio>
    </div>
</template>