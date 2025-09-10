<script setup lang="ts">
import { AudioLines, Heart, ListMusic, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Volume, Volume1, Volume2, VolumeOff } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { useAudioPlayerStore } from '~/stores/audioPlayer';

const player = useAudioPlayerStore();

const audioElement = ref<HTMLAudioElement | null>(null);

onMounted(() => {
    audioElement.value = document.querySelector('audio');
    console.log('Audio Element:', audioElement.value?.currentTime);

})


function togglePlay() {
    if (!audioElement.value) return;
    if (player.playing) {
        audioElement.value.pause();
    } else {
        audioElement.value.play();
    }
    player.setPlaying(!player.playing);
}
</script>

<template>
    <div class="p-4 flex flex-row items-center gap-4 border-t">
        <div class="flex flex-row">
            <Button @click="togglePlay" variant="ghost">
                <Play v-if="!player.playing" />
                <Pause v-else />
            </Button>
        </div>
        <audio controls hidden src=""></audio>
    </div>
</template>