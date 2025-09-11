<script setup lang="ts">
import { AudioLines, Heart, ListMusic, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Volume, Volume1, Volume2, VolumeOff, Music } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { useAudioEntity, useAudioPlayerStore } from '~/stores/audioPlayer';
import { Slider } from '@/components/ui/slider';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const player = useAudioPlayerStore();
const audioEntity = useAudioEntity();

const audioElement = ref<HTMLAudioElement>();

onMounted(() => {
    audioElement.value?.addEventListener('ended', () => {
        if (player.hasNext) {
            player.next();
            return;
        }
        player.setPlaying(false);
    });

    audioElement.value?.addEventListener('timeupdate', () => {
        if (!audioElement.value) return;
        player.setCurrentTime(audioElement.value.currentTime * 1000);
    });
})


function togglePlay() {
    player.setPlaying(!player.playing);
}

function getMMSSFromMS(ms: number) {
    if (!ms || ms <= 0) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function setCurrentTrackSrc() {
    if (!player.currentTrack) return '';
    const url = player.currentTrack.quality.find(q => q.type === player.preferredQuality)?.url || player.currentTrack.quality[0]?.url || '';
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

watch([() => player.currentTrack, () => player.preferredQuality], () => {
    if (!audioElement.value) return;
    const src = setCurrentTrackSrc();
    if (!src) return;
    if (player.playing) {
        audioElement.value.src = src;
        audioElement.value.play();
    }
});

watch([() => player.muted, () => player.volume], ([muted, volume]) => {
    if (!audioElement.value) return;
    audioElement.value.muted = muted;
    audioElement.value.volume = volume;
});

const nextCursor = () => {
    player.next();
}

const prevCursor = () => {
    player.prev();
}

const progressValue = computed(() => {
    const duration = player.currentTrack?.durationMs;
    if (!duration || duration <= 0) return 0;
    const percent = (player.currentTime / duration) * 100;
    if (!Number.isFinite(percent)) return 0;
    return Math.min(100, Math.max(0, percent));
});

const sliderPercent = computed({
    get() {
        return [progressValue.value];
    },
    set(val: number[]) {
        const duration = player.currentTrack?.durationMs;
        if (!duration || !val || val[0] == null) return;
        const percent = Math.min(100, Math.max(0, val[0]));
        const newTimeMs = duration * (percent / 100);
        player.setCurrentTime(newTimeMs);
        if (audioElement.value) {
            audioElement.value.currentTime = newTimeMs / 1000;
        }
    }
});

const sliderVolume = computed({
    get() {
        return [player.volume];
    },
    set(val: number[]) {
        if (!val || val[0] == null) return;
        const volume = Math.min(1, Math.max(0, val[0]));
        player.volume = volume;
        if (volume > 0) {
            player.muted = false;
        } else {
            player.muted = true;
        }
    }
});

</script>

<template>
    <div v-show="player.currentTrack"
        class="p-4 flex flex-row items-center gap-4 border-t sticky bottom-0 bg-background">
        <div class="flex flex-row">
            <Button @click="togglePlay" variant="ghost" :disabled="!player.hasQueue">
                <Play v-if="!player.playing" />
                <Pause v-else />
            </Button>
            <Button variant="ghost" @click="prevCursor" :disabled="!player.hasPrev">
                <SkipBack />
            </Button>
            <Button variant="ghost" @click="nextCursor" :disabled="!player.hasNext">
                <SkipForward />
            </Button>
            <Button variant="ghost">
                <Shuffle />
            </Button>
            <Button variant="ghost">
                <Repeat />
            </Button>
        </div>
        <div class="flex flex-2 items-center gap-4">
            <div>{{ getMMSSFromMS(player.currentTime) }}</div>
            <div class="flex-1">
                <Slider v-model="sliderPercent" :max="100" :step="0.1" />
            </div>
            <div>
                <div>{{ getMMSSFromMS(player.currentTrack?.durationMs || 0) }}</div>
            </div>
        </div>
        <div>
            <HoverCard>
                <HoverCardTrigger as-child>
                    <Button variant="ghost" @click="player.muted = !player.muted">
                        <VolumeOff v-if="player.muted" />
                        <Volume v-else-if="player.volume === 0" />
                        <Volume1 v-else-if="player.volume * 100 > 0 && player.volume * 100 < 50" />
                        <Volume2 v-else />
                    </Button>
                </HoverCardTrigger>
                <HoverCardContent side="top" :side-offset="5" class="p-5 w-auto m-5">
                    <Slider v-model="sliderVolume" :step="0.01" :max="1" orientation="vertical" />
                </HoverCardContent>
            </HoverCard>
        </div>
        <div class="flex flex-1 items-center gap-3 rounded-lg p-2 hover:bg-accent dark:hover:bg-accent/50">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-700 md:h-12 md:w-12">
                <img v-if="player.currentTrack?.album.cover" :src="player.currentTrack?.album.cover" alt="Album cover"
                    class="h-full w-full rounded-lg object-cover" />
                <Music v-else class="h-full w-full object-cover text-gray-400" />
            </div>

            <div class="flex flex-1 flex-col text-left overflow-hidden w-40 md:w-64">
                <div ref="titleRef" class="text-sm font-medium text-white whitespace-nowrap"
                    :title="player.currentTrack?.name">
                    {{ player.currentTrack?.name }}
                </div>

                <div class="text-xs text-gray-400 whitespace-nowrap "
                    :title="player.currentTrack?.artists.map(artist => artist.name).join(', ')">
                    {{player.currentTrack?.artists.map(artist => artist.name).join(", ")}}
                </div>

                <div class="hidden text-xs text-gray-500 md:block whitespace-nowrap "
                    :title="player.currentTrack?.album.name">
                    {{ player.currentTrack?.album.name }}
                </div>
            </div>
        </div>
        <div>
            <Button variant="ghost">
                <Heart />
            </Button>

            <Popover>
                <PopoverTrigger as-child>
                    <Tooltip>
                        <TooltipTrigger as-child>
                            <Button variant="ghost">
                                <ListMusic />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p class="p-1">
                                Playlist
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </PopoverTrigger>
                <PopoverContent :side-offset="25">

                </PopoverContent>
            </Popover>

            <Popover>
                <PopoverTrigger as-child>
                    <Tooltip>
                        <TooltipTrigger as-child>
                            <Button variant="ghost">
                                <AudioLines />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p class="p-1">
                                Playing in {{ player.currentQuality?.type }} Quality
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </PopoverTrigger>
                <PopoverContent :side-offset="25">
                </PopoverContent>
            </Popover>
        </div>
        <audio ref="audioElement" hidden></audio>
    </div>
    <div v-show="!player.currentTrack"></div>
</template>