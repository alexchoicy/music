<script setup lang="ts">
import { useAudioEntity } from "#imports";
import { getMMSSFromMs } from "~/lib/music/display";
import { Play } from "lucide-vue-next";
const audioEntity = useAudioEntity();
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex p-4 flex-col">
      <h2 class="text-lg font-semibold">Current Playlist</h2>
      <div class="pt-2">
        <p class="text-sm">{{ audioEntity.playList.length }} Playlist</p>
        <p class="text-sm">{{ audioEntity.getTotalTrack }} Songs</p>
      </div>
    </div>
    <Separator />
    <div class="flex flex-col px-4">
      <div v-for="list of audioEntity.playList" :key="list.playListRef" class="flex flex-col">
        <div v-for="track of list.tracks" :key="`${list.playListRef}-${track.id}`"
          class="group flex flex-row gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
          <div class="relative flex-shrink-0">
            <div class="h-12 w-12 rounded-md bg-gradient-to-br flex items-center justify-center">
              <img v-if="track.album.cover" :src="track.album.cover" :alt="track.name"
                class="h-full w-full object-cover rounded-md">
            </div>
            <div
              class="absolute inset-0 flex items-center justify-center bg-black/40 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
              <Play class="h-5 w-5 text-white fill-current" />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="truncate">
              {{ track.name }}
            </div>
            <div class="text-muted-foreground truncate">
              {{track.artists.map((artist) => artist.name).join(", ")}}
            </div>
          </div>
          <div class="text-muted-foreground">
            {{ getMMSSFromMs(track.durationMs) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
