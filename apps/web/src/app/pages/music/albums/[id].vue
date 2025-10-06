<script setup lang="ts">
import type { AlbumDetailResponse } from '@music/api/dto/album.dto';
import { getHHMMFromMs } from '~/lib/music/display';
import { Play, FolderDown, User, Users, DiscAlbum } from 'lucide-vue-next';
const id = useRoute().params.id as string;

const { data: album } = await useAPI<AlbumDetailResponse>(`/albums/${id}`, {
    method: 'GET',
});

const onClickArtist = (artistId: string) => {
    useRouter().push(`/music/artists/${artistId}`);
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
                        <span>{{ album.mainArtist.name }}</span>
                        <span v-if="album.year">•</span>
                        <span v-if="album.year">{{ album.year }}</span>
                        <span>•</span>
                        <span>{{ album.totalTracks }} songs</span>
                        <span>•</span>
                        <span>{{ getHHMMFromMs(album.totalDurationMs) }}</span>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <Button size="lg" class="rounded-full px-8">
                        <Play class="w-5 h-5 mr-2" fill="currentColor" />
                        Play
                    </Button>
                    <Button size="lg" variant="ghost" class="rounded-full">
                        <FolderDown class="size-fit" />
                    </Button>
                </div>
            </div>
        </div>
        <div class="gap-4 grid grid-cols-1 lg:grid-cols-3">
            <MusicAlbumsAlbumMusicList v-if="album" :album="album" class="lg:col-span-2" />
            <Card class="h-fit">
                <CardHeader>
                    <CardTitle>
                        Artists
                    </CardTitle>
                </CardHeader>
                <CardHeader>
                    <div v-for="artist in album.artists" :key="artist.id" class="space-y-2">
                        <div class="flex items-center gap-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer p-2"
                            @click="onClickArtist(artist.id)">
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
