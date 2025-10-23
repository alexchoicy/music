<script setup lang="ts">
  import AlbumCard from "~/components/music/albums/albumCard.vue";
  import type { AlbumResponse } from "@music/api/dto/album.dto";

  const albums = ref<AlbumResponse[]>([]);
  const pending = ref(true);

  onMounted(async () => {
    const data = await useNuxtApp().$backend<AlbumResponse[]>("albums");

    if (data) {
      albums.value.push(...data);
      pending.value = false;
    }
  });
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
    <template v-if="pending">
      <div v-for="n in 12" :key="'skeleton-' + n" class="rounded-lg overflow-hidden bg-muted animate-pulse h-[260px]" />
    </template>
    <template v-else>
      <AlbumCard v-for="item in albums" :key="item.id" :album="item" />
    </template>
  </div>
</template>
