<script setup lang="ts">
import Navbar from '@/components/layouts/navbar.vue';
import AudioPlayer from '@/components/music/audioPlayer.vue';
</script>

<template>
    <SidebarProvider>
        <Sidebar>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarMenu>
                        DATA
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
        <SidebarInset>
            <div class="flex flex-col h-full">
                <Navbar />
                <Separator />\
                <div class="flex-1">
                    <slot />
                </div>
                <AudioPlayer />
            </div>
        </SidebarInset>
    </SidebarProvider>
</template>