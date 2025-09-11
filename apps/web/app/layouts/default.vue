<script setup lang="ts">
import Navbar from '@/components/layouts/navbar.vue';
import AudioPlayer from '@/components/music/audioPlayer.vue';
</script>

<template>
    <TooltipProvider>
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
                    <Navbar class="sticky top-0 z-10 bg-background" />
                    <Separator />
                    <div class="flex-1">
                        <slot class="overflow-y-auto" />
                    </div>
                    <AudioPlayer />
                </div>
            </SidebarInset>
        </SidebarProvider>
    </TooltipProvider>

</template>