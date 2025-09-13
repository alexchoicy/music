<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card';
import { ArtistSchema } from '@music/api/dto/album.dto';

import { User } from 'lucide-vue-next';
import { navigateTo } from 'nuxt/app';
const props = defineProps<{
    data: ArtistSchema
}>();

const clickCard = (id: string) => {
    return navigateTo(`/music/artists/${id}`);
}

</script>

<template>
    <Card @click="clickCard(data.id)"
        class="hover:bg-muted transition-all duration-300 hover:scale-105 hover:shadow-2xl border-0 rounded-lg overflow-hidden cursor-pointer">
        <CardContent>
            <div class="flex flex-col items-center space-y-4">
                <img v-if="data.image" :src="data.image" alt="Artist Image"
                    class="w-48 h-48 object-cover rounded-full border-4 border-background shadow-xl" />
                <div v-else
                    class="w-48 h-48 flex items-center justify-center bg-muted rounded-full border-4 border-background shadow-xl">
                    <User class="w-40 h-40 text-gray-400" />
                </div>
                <div>
                    <h3 class="text-lg font-medium">{{ data.name }}</h3>
                </div>
            </div>
        </CardContent>
    </Card>
</template>