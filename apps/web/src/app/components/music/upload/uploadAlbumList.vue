<script setup lang="ts">
  import type { UploadAlbum, UploadDisc, UploadMusic } from "@music/api/type/music";
  import { ref } from "vue";
  import UploadAlbumListItem from "./uploadAlbumListItem.vue";
  import UploadAlbumListDetail from "./uploadAlbumListDetail.vue";

  const props = defineProps({
    albums: {
      type: Array as () => UploadAlbum[],
      required: true,
    },
    blockUpload: {
      type: Boolean,
      required: true,
    },
    fileObjects: {
      type: Object as () => Map<string, { file: File; uploadHash: string }>,
      required: true,
    },
    reSortAlbums: {
      type: Function,
      required: true,
    },
  });

  const emit = defineEmits(["update:blockUpload"]);

  const currentTrack = ref<UploadMusic | null>(null);
  const isTrackEditDialogOpen = ref(false);

  const currentAlbum = ref<UploadAlbum | null>(null);
  const isAlbumEditDialogOpen = ref(false);

  function getCurrentTrackInfo(albumHash: string, trackHash: string) {
    const album = props.albums.find((a) => a.hash === albumHash);
    if (!album) return null;

    for (const disc of album.disc) {
      const track = disc.musics.find((t: UploadMusic) => t.hash === trackHash);
      if (track) {
        return {
          track,
        };
      }
    }

    return null;
  }

  function trackRemover(albumHash: string, trackHash: string) {
    const album = props.albums.find((a) => a.hash === albumHash);
    if (!album) return;

    for (const disc of album.disc) {
      const trackIndex = disc.musics.findIndex((t: UploadMusic) => t.hash === trackHash);
      if (trackIndex !== -1) {
        disc.musics.splice(trackIndex, 1);
        album.NoOfTracks -= 1;
        if (disc.musics.length === 0) {
          const discIndex = album.disc.findIndex((d: UploadDisc) => d.no === disc.no);
          if (discIndex !== -1) {
            album.disc.splice(discIndex, 1);
            album.NoOfDiscs -= 1;
          }
        }
        break;
      }
    }
    props.fileObjects.delete(trackHash);
    if (album.disc.length === 0) {
      const albumIndex = props.albums.findIndex((a) => a.hash === albumHash);
      if (albumIndex !== -1) {
        props.albums.splice(albumIndex, 1);
      }
    }
  }

  function onAlbumEditOpen(albumHash: string) {
    const album = props.albums.find((a) => a.hash === albumHash);
    if (!album) return;
    currentAlbum.value = album;
    isAlbumEditDialogOpen.value = true;
  }

  function onTrackEditOpen(albumHash: string, trackHash: string) {
    const trackInfo = getCurrentTrackInfo(albumHash, trackHash);
    if (!trackInfo) return;
    currentTrack.value = trackInfo.track;
    isTrackEditDialogOpen.value = true;
  }
</script>

<template>
  <div class="space-y-6">
    <div v-for="album in props.albums" :key="album.hash" class="bg-card rounded-lg border">
      <div class="p-4 border-b w-full">
        <UploadAlbumListDetail :album="album" :block-upload="props.blockUpload" :on-album-edit-open="onAlbumEditOpen" />
      </div>
      <div class="bg-card/20">
        <div class="px-4 py-2 border-b bg-card/50">
          <div class="flex items-center text-xs gap-4 text-gray-400 font-medium">
            <div class="w-8 text-center">#</div>
            <div class="flex-1">Title</div>
            <div class="w-20 text-center">Duration</div>
            <div class="w-20" />
          </div>
        </div>
        <div v-for="disc in album.disc" :key="`${album.hash}-${disc.no}`" class="divide-y divide-gray-800/30 w-full">
          <div class="px-4 py-2 transition-colors group">
            <div class="flex items-center gap-4">
              <div class="text-center">
                <span>Disc {{ disc.no }}</span>
              </div>
            </div>
          </div>
          <div v-for="track in disc.musics" :key="track.hash" class="divide-y hover:bg-gray-800/30">
            <UploadAlbumListItem
              :album="album"
              :track="track"
              :block-upload="props.blockUpload"
              :track-remover="trackRemover"
              :on-track-edit-open="onTrackEditOpen" />
          </div>
        </div>
      </div>
    </div>
    <MusicUploadAlbumEditDialog
      v-if="currentAlbum"
      :is-open="isAlbumEditDialogOpen"
      :current-album="currentAlbum"
      @update:is-open="isAlbumEditDialogOpen = $event"
      @update:current-album="currentAlbum = $event" />

    <MusicUploadMusicEditDialog
      v-if="currentTrack"
      :is-open="isTrackEditDialogOpen"
      :current-track="currentTrack"
      :albums="props.albums"
      :re-sort-albums="
        async () => {
          emit('update:blockUpload', true);
          await props.reSortAlbums();
          emit('update:blockUpload', false);
        }
      "
      @update:is-open="isTrackEditDialogOpen = $event"
      @update:current-track="currentTrack = $event" />
  </div>
</template>
