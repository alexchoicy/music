<script setup lang="ts">
import { DiscAlbum, Play } from 'lucide-vue-next';
import type { AlbumDetailResponse, AlbumResponse } from '@music/api/dto/album.dto'
import { parsePlaylistFromAlbumDetail } from '~/lib/music/playerUtils';

const props = defineProps({
    album: {
        type: Object as () => AlbumResponse,
        required: true
    }
})

const audioPlayer = useAudioPlayer();

function handleAlbumClick() {
    return navigateTo({
        path: `/music/albums/${props.album.id}`,
    })
}

async function getAlbumInfo(albumID: string): Promise<AlbumDetailResponse> {
    return await useNuxtApp().$backend<AlbumDetailResponse>(`albums/${albumID}`, {
        method: 'GET',
    })
}


function handlePlayClick() {
    getAlbumInfo(props.album.id).then((albumDetail) => {
        const playlist = parsePlaylistFromAlbumDetail(albumDetail);
        audioPlayer.playWithList(playlist);
    })
}
</script>

<template>
    <Card
        class="group hover:bg-muted transition-all duration-300 hover:scale-105 hover:shadow-2xl border-0 rounded-lg cursor-pointer"
        @click="handleAlbumClick">
        <CardContent>
            <div class="aspect-square relative overflow-hidden">
                <img v-if="album.cover" :src="album.cover" class="w-full h-full object-cover">
                <DiscAlbum v-else class="w-full h-full text-muted-foreground" />
                <Badge variant="secondary"
                    class="absolute top-2 right-2 bg-black/60 text-white border-0 backdrop-blur-sm">
                    {{ album.albumType }}
                </Badge>
                <Button size="icon"
                    class="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-primary shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 cursor-pointer"
                    @click.stop="handlePlayClick">
                    <Play
                        class="w-5 h-5 fill-primary-foreground text-primary-foreground ml-0.5 hover:fill-primary-foreground/20" />
                </Button>
            </div>
            <div class="p-4 space-y-1">
                <h3 class="text-lg font-semibold text-foreground truncate">{{ album.name }}</h3>
                <p class="text-sm text-muted-foreground">{{ album.mainArtist.name }}</p>
                <div class="flex gap-1 flex-wrap">
                    <Badge v-if="album.hasInstrumental" variant="outline" class="opacity-60">
                        Instrumental
                    </Badge>
                </div>
                <p class="text-sm text-muted-foreground"><span v-if="album.year != 0">{{ album.year }}
                        •</span>
                    {{ album.totalTracks }} songs</p>
            </div>
        </CardContent>
    </Card>
</template>