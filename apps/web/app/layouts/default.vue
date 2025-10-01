<script setup lang="ts">
import AppSidebar from '@/components/layouts/appSidebar.vue';
import Navbar from '@/components/layouts/navbar.vue';
import AudioPlayer from '@/components/music/audioPlayer.vue';
</script>

<template>
    <TooltipProvider>
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <div class="flex flex-col h-full">
                    <Navbar class="sticky top-0 z-10 bg-background" />
                    <Separator />
                    <slot class="overflow-y-auto" />
                    <AudioPlayer />
                </div>
            </SidebarInset>
        </SidebarProvider>
    </TooltipProvider>
</template>