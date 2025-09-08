<script setup lang="ts">
const config = useRuntimeConfig()

const { data, pending, error } = await useAPI('', {
    server: false,
    immediate: true
})
</script>

<template>
    <div>
        {{ config.public.apiBase }}
    </div>
    <client-only fallback="Loading...">
        <div v-if="pending">Loading...</div>
        <div v-else-if="error">Error: {{ error.message }}</div>
        <div v-else>Status: {{ data }}</div>
    </client-only>
</template>