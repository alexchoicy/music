<script setup lang="ts">
import {
    SidebarTrigger,
} from "@/components/ui/sidebar"
</script>


<template>
    <header class="flex h-16 shrink-0 items-center gap-2 px-4">
        <SidebarTrigger class="-ml-1" />
        <NuxtLink to="/" class="text-lg font-bold">
            Music
        </NuxtLink>
        <NuxtLink to="/music/upload"
            class="ml-auto rounded bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Upload
        </NuxtLink>
    </header>
</template>