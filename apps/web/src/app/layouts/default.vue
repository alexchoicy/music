<script setup lang="ts">
import Sidebar from '~/components/layouts/sidebar.vue';


</script>

<template>
    <SidebarProvider>
        <Sidebar />
        <SidebarInset>
            <div class="flex flex-col h-full">
                <div class="sticky top-0 z-10 bg-background">
                    <LayoutsNavbar />
                    <Separator />
                </div>
                <div class="p-6 overflow-y-auto">
                    <slot />
                </div>
            </div>
        </SidebarInset>
    </SidebarProvider>
</template>