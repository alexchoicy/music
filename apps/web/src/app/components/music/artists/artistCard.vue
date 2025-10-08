<script setup lang="ts">
import type { ArtistInfo } from '@music/api/dto/album.dto';
import { User } from 'lucide-vue-next';


const props = defineProps({
    artist: {
        type: Object as () => ArtistInfo,
        required: true
    }
})

const clickCard = (id: string) => {
    return navigateTo(`/music/artists/${id}`);
}
</script>

<template>
    <Card @click="clickCard(artist.id)"
        class="hover:bg-muted transition-all duration-300 hover:scale-105 hover:shadow-2xl border-0 rounded-lg overflow-hidden cursor-pointer">
        <CardContent>
            <div class="aspect-square relative overflow-hidden rounded-full">
                <img v-if="artist.image" :src="artist.image" alt="Artist Image" class="w-full h-full object-cover" />
                <img v-if="artist.albums[0]?.cover" :src="artist.albums[0]?.cover" alt="Album Cover"
                    class="w-full h-full object-cover" />
                <User v-else class="w-full h-full text-muted-foreground" />
            </div>
            <div class="space-y-1 text-center pt-2">
                <h3 class="truncate">{{ artist.name }}</h3>
            </div>
            <div class="text-center mt-2">
                <Badge variant="secondary" class="bg-black/60 text-white border-0 backdrop-blur-sm">
                    {{ artist.artistType }}
                </Badge>
            </div>
        </CardContent>
    </Card>
</template>