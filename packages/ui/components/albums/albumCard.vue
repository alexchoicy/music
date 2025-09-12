<script setup lang="ts">
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Play } from 'lucide-vue-next';
import type { AlbumDetailResponse, AlbumResponse } from '@music/api/dto/album.dto';
import { useAudioEntity, useAudioPlayerStore } from '../../stores/audioPlayer';
import { parsePlayerPlayListFromAlbumDetail, parsePlaylistFromAlbumDetail } from '../../lib/music/parse';
import type { PropType } from 'vue';

const player = useAudioPlayerStore();
const audioEntity = useAudioEntity();
const props = defineProps({
    album: {
        type: Object as () => AlbumResponse,
        required: true,
    },
    getAlbumInfo: {
        type: Function as PropType<(albumID: string) => Promise<AlbumDetailResponse>>,
        required: true,
    }
});

const clickPlay = async (albumID: string) => {
    console.log('click play album', albumID);
    player.clear();
    const albumInfo = await props.getAlbumInfo(albumID);
    const playList = parsePlaylistFromAlbumDetail(albumInfo);

    audioEntity.upsert(playList);

    player.setPlayList(
        parsePlayerPlayListFromAlbumDetail(playList)
    );

    player.setPlaying(true);
}

</script>


<template>
    <Card v-if="props.album" @click="console.log('click album')"
        class="group hover:bg-muted transition-all duration-300 hover:scale-105 hover:shadow-2xl border-0 rounded-lg overflow-hidden cursor-pointer">
        <div class="aspect-square relative overflow-hidden">
            <img v-if="props.album.cover" :src="props.album.cover" alt="" class="w-full h-full object-cover" />
            <div v-else>

            </div>

            <Button size="icon" @click.stop="clickPlay(props.album.id)"
                class="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-primary shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 cursor-pointer">
                <Play
                    class="w-5 h-5 fill-primary-foreground text-primary-foreground ml-0.5 hover:fill-primary-foreground/20" />
            </Button>
        </div>
        <div class="p-4 space-y-1">
            <h3 class="text-lg font-semibold text-foreground truncate">{{ props.album.name }}</h3>
            <p class="text-sm text-muted-foreground">{{ props.album.mainArtist.name }}</p>
            <p class="text-sm text-muted-foreground"><span v-if="props.album.year != 0">{{ props.album.year }} •</span>
                {{ props.album.totalTracks }} songs</p>
        </div>
    </Card>
</template>