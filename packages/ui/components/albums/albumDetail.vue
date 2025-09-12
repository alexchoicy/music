<script setup lang="ts">
import type { AlbumDetailResponse } from '@music/api/dto/album.dto';
import { getHHMMFromMs } from '@/lib/music/utils';
import { Button } from '@/components/ui/button';
import { Play, User, Users } from 'lucide-vue-next';
import { Badge } from '@/components/ui/badge';
import { ref } from 'vue';
import { useAudioEntity, useAudioPlayerStore } from '../../stores/audioPlayer';
import { parsePlayerPlayListFromAlbumDetail, parsePlaylistFromAlbumDetail } from '../../lib/music/parse';

const player = useAudioPlayerStore();

const props = defineProps<{
    album: AlbumDetailResponse
}>()

const clickPlayAll = () => {
    if (!props.album) return;
    const playList = parsePlaylistFromAlbumDetail(props.album);
    player.playWithList(playList);
}

const clickTrackPlay = (index: number) => {
    const playList = parsePlaylistFromAlbumDetail(props.album);
    player.playWithListAndIndex(playList, index);
};

</script>

<template>
    <div class="p-10 w-full h-full">
        <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <div class="xl:col-span-3 space-y-6">
                <div class="space-y-4">
                    <h1 class="text-3xl font-bold mb-4">{{ album.name }}</h1>
                    <div class="flex items-center gap-2 text-muted-foreground text-sm">
                        <!-- <NuxtLink :to="`/artist/${album.mainArtist.id}`"
                            class="hover:underline cursor-pointer flex flex-row items-center"> -->
                        <Users v-if="album.mainArtist.artistType === 'group'" class="inline-block w-4 h-4 mr-1" />
                        <User v-else class="inline-block w-4 h-4 mr-1" />
                        <p>{{ album.mainArtist.name }}</p>
                        <!-- </NuxtLink> -->
                        <div v-if="album.year && album.year !== 0" class="flex items-center">
                            <span>•</span>
                            <span class="ml-1">{{ album.year }}</span>
                        </div>
                        <div>
                            <span>•</span>
                            <span class="ml-1">{{ getHHMMFromMs(album.totalDurationMs) }}</span>
                        </div>
                    </div>
                    <div class="flex flex-row items-center">
                        <Button variant="ghost" @click="clickPlayAll"
                            class="mr-4 rounded-full w-16 h-16 flex items-center justify-center">
                            <Play class="size-fit" />
                        </Button>
                    </div>
                </div>
                <div class="mt-10">
                    <div class="px-4 py-2 border-b bg-card/50">
                        <div class="flex items-center text-xs gap-4 text-gray-400 font-medium">
                            <div class="w-8 text-center">#</div>
                            <div class="flex-1">Title</div>
                            <div class="w-20 text-center">Duration</div>
                            <div class="w-20"></div>
                        </div>
                    </div>
                    <div v-for="disc in album.Disc" class=" divide-y divide-gray-800/30 w-full">
                        <div class="px-4 py-2 transition-colors group ">
                            <div class="flex items-center gap-4">
                                <div class="text-center">
                                    <span>Disc {{ disc.discNo }}</span>
                                </div>
                            </div>
                        </div>
                        <div v-for="(track, index) in disc.tracks" class="divide-y hover:bg-gray-800/30">
                            <div class="px-4 py-1 transition-colors group">
                                <div class="flex items-center gap-4">
                                    <div class="w-8 text-center">
                                        <div class="w-8 text-center group-hover:hidden">
                                            <span class="text-sm">{{ track.trackNo }}</span>
                                        </div>
                                        <Button variant="ghost" class="w-8 hidden group-hover:inline-flex"
                                            @click="clickTrackPlay(index)">
                                            <Play class="size-fit" />
                                        </Button>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <h3 class="font-medium text-sm truncate" :title="track.name">{{
                                            track.name }}
                                            <Badge v-if="track.isInstrumental"
                                                class="dark:border-purple-500/50 dark:text-purple-300 border-purple-700/50 text-purple-500 text-xs px-1 py-0"
                                                variant="secondary">
                                                Instrumental
                                            </Badge>
                                        </h3>
                                        <div class="text-xs text-gray-400">
                                            <span v-for="(artist, index) in track.artists" class="">
                                                {{ artist.name }}<span v-if="!(index === track.artists.length - 1)">,
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                    <div class="w-20 text-center">
                                        <span class="text-sm text-gray-400">{{ getHHMMFromMs(track.durationMs)
                                        }}</span>
                                    </div>
                                    <div class="w-20 flex text-center justify-end gap-1 ">

                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="space-y-6 flex-1">
                <div class="">
                    <img v-if="album.cover" :src="album.cover" class="w-full rounded-lg shadow-2xl mb-6" />
                    <div v-else
                        class="w-full aspect-square bg-gray-800 rounded-lg mb-6 flex items-center justify-center">
                        <span class="text-gray-500">No Cover</span>
                    </div>
                </div>
                <div class="">
                    <div v-for="artist in album.artists"
                        class="flex items-center gap-2 mb-4 h-15 w-full overflow-hidden">
                        <img v-if="artist.image" :src="artist.image"
                            class="h-full w-auto rounded-full object-cover  flex-shrink-0" />
                        <div v-else
                            class="h-12 w-12 bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
                            <User class="w-6 h-6 text-gray-500" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <h4 class="font-medium truncate">{{ artist.name }}</h4>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>