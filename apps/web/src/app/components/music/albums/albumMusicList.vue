<script setup lang="ts">
import type { AlbumDetailResponse } from '@music/api/dto/album.dto';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { getMMSSFromMs } from '~/lib/music/display';
import { EllipsisVertical, Play, Clock } from 'lucide-vue-next';


const props = defineProps({
    album: {
        type: Object as () => AlbumDetailResponse,
        required: true
    },
    onclickPlayTrack: {
        type: Function,
        required: true
    }
})
</script>

<template>
    <Card>
        <CardContent>
            <div class="flex items-center gap-4 text-muted-foreground">
                <div class="w-8 text-center">#</div>
                <div class="flex-1">Title</div>
                <Clock class="size-fit" />
                <div class="w-9"></div>
            </div>
            <div v-for="disc in album.Disc">
                <div class="flex items-center gap-2 pt-4">
                    <div class="h-px flex-1 bg-border" />
                    <span class="text-muted-foreground px-3">Disc {{ disc.discNo }}</span>
                    <div class="h-px flex-1 bg-border" />
                </div>
                <div class="space-y-1">
                    <div v-for="track in disc.tracks" :key="track.id"
                        class="group flex items-center gap-4 py-2 rounded-md hover:bg-accent/50 transition-colors">
                        <div class="w-8 text-center group-hover:hidden">
                            <span class="text-sm">{{ track.trackNo }}</span>
                        </div>
                        <Button variant="ghost" class="w-8 hidden group-hover:inline-flex"
                            @click="props.onclickPlayTrack(track.index)">
                            <Play class="size-fit" />
                        </Button>
                        <div class="flex-1 min-w-0">
                            <div class="truncate">{{ track.name }} <Badge variant="secondary"
                                    v-if="track.isInstrumental"
                                    class="dark:border-purple-500/50 dark:text-purple-300 border-purple-700/50 text-purple-500 text-xs px-1 py-0">
                                    Instrumental
                                </Badge>
                            </div>
                            <div class="text-muted-foreground truncate">
                                {{track.artists.map(artist => artist.name).join(', ')}}
                            </div>
                        </div>
                        <div class="text-muted-foreground">{{ getMMSSFromMs(track.durationMs) }}</div>
                        <Button variant="ghost" size="icon"
                            class="opacity-0 group-hover:opacity-100 transition-opacity">
                            <EllipsisVertical class="size-fit" />
                        </Button>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
</template>