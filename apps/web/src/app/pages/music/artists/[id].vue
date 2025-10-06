<script setup lang="ts">
import type { Artist } from "@music/api/dto/artist.dto";
import { User } from "lucide-vue-next";

const id = useRoute().params.id as string;

const { data } = await useAPI<Artist>(`/artists/${id}`, {
    method: 'GET',
});

const tab = [
    { name: "Overview", id: "overview" },
    { name: "Albums", id: "albums" },
    { name: "Single", id: "single" },
];

const currentTab = ref("overview");

const selectTab = (tabId: string) => {
    currentTab.value = tabId;
    nextTick(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
};

const albumOnly = computed(() =>
    (data.value?.albums?.filter((album) => album.albumType === "Album") ?? [])
);
const singleOnly = computed(() =>
    (data.value?.albums?.filter((album) => album.albumType === "Single") ?? [])
);
</script>

<template>
    <div v-if="data">
        <div class="relative h-[400px] w-full overflow-hidden bg-gradient-to-b from-purple-700 to-background">
            <div class="absolute inset-0">
                <img v-if="data.albums[0]?.cover" :src="data.albums[0].cover" alt="Artist Image"
                    class="w-full h-full object-cover opacity-40" />
                <div class="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
            </div>
            <div class="relative flex h-full items-end p-6 md:p-8">
                <div class="flex items-end gap-6">
                    <div class="hidden h-48 w-48 flex-shrink-0 overflow-hidden rounded-full shadow-2xl md:block">
                        <img v-if="data.image" :src="data.image" alt="Artist Image"
                            class="h-full w-full object-cover" />
                        <img v-else-if="data.albums[0]?.cover" :src="data.albums[0].cover" alt="Artist Image"
                            class="w-full h-full object-cover" />
                        <User v-else class="w-full h-full text-muted-foreground" />
                    </div>
                    <div class="flex flex-col gap-2 pb-2">
                        <h1 class="text-5xl md:text-7xl">{{ data.name }}</h1>
                    </div>
                </div>
            </div>
        </div>
        <div class="sticky top-16 z-2 bg-background h-15">
            <div class="flex gap-8 border-b h-full px-2">
                <Button @click="selectTab(tabItem.id)"
                    class="text-sm font-medium transition-colors relative rounded-none h-full cursor-pointer"
                    v-for="tabItem in tab" :key="tabItem.id" :class="{ 'text-primary': currentTab === tabItem.id }"
                    variant="ghost">
                    {{ tabItem.name }}
                    <div v-if="currentTab === tabItem.id" class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                </Button>
            </div>
        </div>
        <div>
            <MusicArtistsTabsOverview v-if="currentTab === 'overview'" :album-only="albumOnly" :single-only="singleOnly"
                :group-member="data.groupMembers" :select-tab="selectTab" />
            <MusicArtistsTabsAlbums v-if="currentTab === 'albums'" :albums="albumOnly" />
            <MusicArtistsTabsAlbums v-if="currentTab === 'single'" :albums="singleOnly" />
        </div>
    </div>
</template>
