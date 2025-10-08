<script setup lang="ts">
import type { AlbumDetailResponse } from '@music/api/dto/album.dto';
import { getHHMMFromMs } from '~/lib/music/display';
import { Play, FolderDown, User, Users, DiscAlbum } from 'lucide-vue-next';
import { parsePlaylistFromAlbumDetail } from '~/lib/music/playerUtils';
import { getMusicExt } from "@music/api/lib/musicUtil";

const id = useRoute().params.id as string;

const audioPlayer = useAudioPlayer();

const { data: album } = await useAPI<AlbumDetailResponse>(`/albums/${id}`, {
    method: 'GET',
});

const onClickArtist = (artistId: string) => {
    useRouter().push(`/music/artists/${artistId}`);
};

const onClickPlayTrack = (index: number) => {
    const playlist = parsePlaylistFromAlbumDetail(album.value!, true);
    audioPlayer.playWithListIndex(playlist, index);
};

const onClickPlayAlbum = () => {
    const playlist = parsePlaylistFromAlbumDetail(album.value!);
    audioPlayer.playWithList(playlist);
};

const downloadAlbum = () => {
    if (!album.value) return;
    for (const disc of album.value.Disc) {
        for (const track of disc.tracks) {
            for (const quality of track.quality) {
                if (!quality.islossless) {
                    continue;
                }
                downloadFile(quality.url, `${disc.discNo}-${track.trackNo} ${track.name}. ${getMusicExt(quality.fileContainer, quality.fileCodec)}`);
                break;
            }
        }
    }
}

const downloadFile = async (url: string, filename: string) => {
    const response = await fetch(url, {
        credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to download file");

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(blobUrl);
};
</script>

<template>
    <div v-if="album">
        <div class="flex gap-8 mb-8 justify-center">
            <div class="flex-shrink-0">
                <div class="w-64 h-64 rounded-xl overflow-hidden">
                    <img v-if="album.cover" :src="album.cover" class="w-full h-full object-cover" />
                    <DiscAlbum v-else class="w-full h-full text-muted-foreground" />
                </div>
            </div>
            <div class="flex-1 flex flex-col gap-4">
                <div class="space-y-2">
                    <Badge variant="secondary" class="px-3 py-1">
                        {{ album.albumType }}
                    </Badge>
                    <h1 class="text-5xl font-bold">{{ album.name }}</h1>
                    <div class="flex items-center gap-2 text-muted-foreground flex-wrap pt-3">
                        <span @click="onClickArtist(album.mainArtist.id)" class="cursor-pointer">{{
                            album.mainArtist.name }}</span>
                        <span v-if="album.year">•</span>
                        <span v-if="album.year">{{ album.year }}</span>
                        <span>•</span>
                        <span>{{ album.totalTracks }} songs</span>
                        <span>•</span>
                        <span>{{ getHHMMFromMs(album.totalDurationMs) }}</span>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <Button size="lg" class="rounded-full px-8" @click="onClickPlayAlbum">
                        <Play class="w-5 h-5 mr-2" fill="currentColor" />
                        Play
                    </Button>
                    <!-- Download button download defualt for now -->
                    <Button size="lg" variant="ghost" class="rounded-full" @click="downloadAlbum">
                        <FolderDown class="size-fit" />
                    </Button>
                </div>
            </div>
        </div>
        <div class="gap-4 grid grid-cols-1 lg:grid-cols-3">
            <MusicAlbumsAlbumMusicList v-if="album" :album="album" class="lg:col-span-2"
                :onclickPlayTrack="onClickPlayTrack" :onClickDownloadTrack="downloadFile" />
            <Card class="h-fit">
                <CardHeader>
                    <CardTitle>
                        Artists
                    </CardTitle>
                </CardHeader>
                <CardHeader>
                    <div v-for="artist in album.artists" :key="artist.id" class="space-y-2">
                        <div class="flex items-center gap-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer p-2"
                            v-if="artist.artistType !== 'project'" @click="onClickArtist(artist.id)">
                            <Avatar>
                                <AvatarImage v-if="artist.image" :src="artist.image" />
                                <AvatarFallback>
                                    <Users v-if="artist.artistType === 'group'" class="size-fit" />
                                    <User v-else class="size-fit" />
                                </AvatarFallback>
                            </Avatar>
                            <div class="flex-1 min-w-0">
                                <h4 class="text-muted-foreground truncate font-medium">{{ artist.name }}</h4>
                            </div>
                        </div>
                    </div>
                </CardHeader>
            </Card>
        </div>
    </div>
</template>
