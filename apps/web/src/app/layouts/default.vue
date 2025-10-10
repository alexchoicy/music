<script setup lang="ts">
import Sidebar from '~/components/layouts/sidebar.vue';
import AudioPlayer from '~/components/music/audioPlayer.vue';

const isBot = useIsBot();

</script>

<template>
    <div v-if="isBot">
        <slot />
        <div>
            <p>You are a bot</p>
        </div>
    </div>
    <TooltipProvider v-else>
        <SidebarProvider>
            <Sidebar />
            <SidebarInset>
                <div class="flex flex-col h-full">
                    <div class="sticky top-0 z-10 bg-background">
                        <LayoutsNavbar />
                        <Separator />
                    </div>
                    <div class="p-6 overflow-y-auto size-full flex-1">
                        <slot />
                    </div>
                    <AudioPlayer />
                </div>
            </SidebarInset>
        </SidebarProvider>
    </TooltipProvider>
</template>