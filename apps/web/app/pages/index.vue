<script setup lang="ts">
const config = useRuntimeConfig()

const { data, pending, error } = await useAPI('', {
    server: false,
    immediate: true
})
import { test_data } from '@/components/temp';
import { useAudioEntity, useAudioPlayerStore } from '@/stores/audioPlayer';
import type { Playlist } from '@/types/playlist';
const audioEntity = useAudioEntity();
const player = useAudioPlayerStore();
const click = () => {
    const refKey = `${test_data.id} + ${Date.now()}`;
    const tracks = test_data.Disc.map(d => d.tracks).flat().map(t => ({
        id: t.id,
        name: t.name,
        artists: t.artists,
        durationMs: t.durationMs * 1000,
        album: {
            id: test_data.id,
            name: test_data.name,
            cover: test_data.cover
        },
        quality: t.quality.map(q => ({
            type: q.type,
            url: q.url,
            fileCodec: q.fileCodec,
            fileContainer: q.fileContainer,
            bitrate: q.bitrate,
            sampleRate: q.sampleRate ?? 0, // default or from q
            islossless: q.islossless ?? false // default or from q
        }))
    }))
    console.log(tracks)
    if (!tracks || tracks.length === 0) return;
    const pl: Playlist = {
        playListRef: refKey,
        name: test_data.name,
        playlistURL: '',
        trackCount: tracks.length,
        durationMs: 0,
        type: 'album',
        tracks: tracks,
    }

    audioEntity.upsert(pl);
    console.log(audioEntity.playList)


    const apl = pl.tracks.map(track => ({
        trackid: track.id,
        playlistRef: pl.playListRef
    }));

    player.setPlayList(apl);

    console.log(player.currentTrack)
}

const nextCursor = () => {
    player.next();
}

</script>

<template>
    <div>
        {{ config.public.apiBase }}
        {{ player.playing }}
        <Button @click="click">Play</Button>
        <Button @click="nextCursor">Next</Button>
    </div>
    <client-only fallback="Loading...">
        <div v-if="pending">Loading...</div>
        <div v-else-if="error">Error: {{ error.message }}</div>
        <div v-else>Status: {{ data }}</div>
    </client-only>
</template>