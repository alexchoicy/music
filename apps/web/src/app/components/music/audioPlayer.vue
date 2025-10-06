<script setup lang="ts">
import { useAudioPlayer } from '~/stores/audioPlayer';
import { AudioLines, Heart, ListMusic, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Volume, Volume1, Volume2, VolumeOff, Music, Repeat1 } from 'lucide-vue-next';
import { getMMSSFromMs } from '~/lib/music/display';
import { RepeatMode } from '~/types/playlist';

const audioPlayer = useAudioPlayer();
const audioElement = ref<HTMLAudioElement>();


onMounted(() => {
    audioPlayer.initFromLocalStorage();
    audioPlayer.subscribeLocalStorage();

    audioElement.value?.addEventListener('ended', async () => {
        audioPlayer.next();
        if (!audioPlayer.hasNext && audioPlayer.repeat === RepeatMode.Off) {
            audioPlayer.stopPlaying();
        }
        await runPlay();
    });

    audioElement.value?.addEventListener('timeupdate', () => {
        if (!audioElement.value) return;
        audioPlayer.setCurrentTime(audioElement.value.currentTime * 1000);
    });
})

watch(() => audioPlayer.playing, (newVal) => {
    if (!audioElement.value) return;
    if (newVal) {
        audioElement.value.play().catch(() => {
            audioPlayer.stopPlaying();
        });
    } else {
        audioElement.value.pause();
    }
});

const runPlay = async () => {
    if (!audioElement.value) return;
    const src = audioPlayer.getPlayUrl;
    if (!src) {
        audioPlayer.manualNext();
        return;
    }

    try {
        audioElement.value.pause();
        audioElement.value.src = src;

        if (audioPlayer.playing) {
            await audioElement.value.play();
        }
    } catch (err: any) {
        if (err?.name !== 'AbortError') console.warn(err);
    }
}


watch([() => audioPlayer.currentItem, () => audioPlayer.currentQuality], async () => {
    await runPlay();
})

watch([() => audioPlayer.volume, () => audioPlayer.muted], () => {
    if (!audioElement.value) return;
    audioElement.value.volume = audioPlayer.muted ? 0 : audioPlayer.volume;
})

const onClickInfo = () => {
    const path = audioPlayer.getAlbumPath;
    if (!path) return;
    navigateTo(path);
}

const durationProcessValue = computed(() => {
    const duration = audioPlayer.currentTrack?.durationMs;
    if (!duration || duration <= 0) return 0;
    const percent = (audioPlayer.currentTime / duration) * 100;
    if (!Number.isFinite(percent)) return 0;
    return Math.min(100, Math.max(0, percent));
});

const sliderDuration = computed({
    get() {
        return [durationProcessValue.value];
    },
    set(val: number[]) {
        const duration = audioPlayer.currentTrack?.durationMs;
        if (!duration || !val || val[0] == null) return;
        const percent = Math.min(100, Math.max(0, val[0]));
        const newTimeMs = duration * (percent / 100);
        audioPlayer.setCurrentTime(newTimeMs);
        if (audioElement.value) {
            audioElement.value.currentTime = newTimeMs / 1000;
        }
    }
});

const sliderVolume = computed({
    get() {
        return [audioPlayer.volume];
    },
    set(val: number[]) {
        if (!val || val[0] == null) return;
        const volume = Math.min(1, Math.max(0, val[0]));
        audioPlayer.volume = volume;
        if (volume > 0) {
            audioPlayer.muted = false;
        } else {
            audioPlayer.muted = true;
        }
    }
});
</script>

<template>
    <div class="sticky bottom-0 z-20 bg-background flex flex-row py-4 border-t border-border">
        <div class="flex flex-row item-center justify-center m-auto">
            <Button variant="ghost" :disabled="!audioPlayer.hasQueue" @click="audioPlayer.togglePlay">
                <Pause v-if="audioPlayer.playing" />
                <Play v-else />
            </Button>
            <Button variant="ghost" :disabled="!audioPlayer.hasPrevious" @click="audioPlayer.manualPrevious">
                <SkipBack />
            </Button>
            <Button variant="ghost" :disabled="!audioPlayer.hasNext" @click="audioPlayer.manualNext">
                <SkipForward />
            </Button>
            <Button variant="ghost" :class="audioPlayer.isShuffling ? 'text-primary' : 'text-muted-foreground'"
                @click="audioPlayer.toggleShuffle">
                <Shuffle />
            </Button>
            <Button variant="ghost" @click="audioPlayer.toggleRepeat">
                <Repeat class="text-muted-foreground" v-if="audioPlayer.repeat === RepeatMode.Off" />
                <Repeat class="text-primary" v-else-if="audioPlayer.repeat === RepeatMode.All" />
                <Repeat1 class="text-primary" v-else-if="audioPlayer.repeat === RepeatMode.One" />
            </Button>
        </div>
        <div class="flex flex-2 items-center gap-4 px-2">
            <div>{{ getMMSSFromMs(audioPlayer.currentTime) }}</div>
            <div class="flex-1">
                <Slider v-model="sliderDuration" :max="100" :step="0.1" :disabled="!audioPlayer.currentTrack" />
            </div>
            <div>
                <div>{{ getMMSSFromMs(audioPlayer.currentTrack?.durationMs || 0) }}</div>
            </div>
        </div>
        <div class="flex items-center justify-center m-auto">
            <HoverCard>
                <HoverCardTrigger as-child>
                    <Button variant="ghost" @click="audioPlayer.muted = !audioPlayer.muted">
                        <VolumeOff v-if="audioPlayer.muted" />
                        <Volume v-else-if="audioPlayer.volume === 0" />
                        <Volume1 v-else-if="audioPlayer.volume * 100 > 0 && audioPlayer.volume * 100 < 50" />
                        <Volume2 v-else />
                    </Button>
                </HoverCardTrigger>
                <HoverCardContent side="top" :side-offset="5" class="p-5 w-auto m-5">
                    <Slider v-model="sliderVolume" :step="0.01" :max="1" orientation="vertical" />
                </HoverCardContent>
            </HoverCard>
        </div>
        <div class="flex flex-1 items-center gap-3 rounded-lg p-2 hover:bg-accent dark:hover:bg-accent/50"
            @click="onClickInfo">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-700 md:h-12 md:w-12">
                <img v-if="audioPlayer.currentTrack?.album.cover" :src="audioPlayer.currentTrack?.album.cover"
                    alt="Album cover" class="h-full w-full rounded-lg object-cover" />
                <Music v-else class="h-full w-full object-cover" />
            </div>

            <div class="flex flex-1 flex-col text-left overflow-hidden w-40 md:w-64">
                <div class="text-base font-semibold text-foreground truncate" :title="audioPlayer.currentTrack?.name">
                    {{ audioPlayer.currentTrack?.name }}
                </div>

                <div class="text-sm text-muted-foreground truncate"
                    :title="audioPlayer.currentTrack?.artists.map(artist => artist.name).join(', ')">
                    {{audioPlayer.currentTrack?.artists.map(artist => artist.name).join(", ")}}
                </div>

                <div class="text-xs text-muted-foreground md:block whitespace-nowrap "
                    :title="audioPlayer.currentTrack?.album.name">
                    {{ audioPlayer.currentTrack?.album.name }}
                </div>
            </div>
        </div>
        <div class="flex items-center justify-end m-auto">
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
                                Playing in {{ audioPlayer.currentQuality }} Quality
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
</template>