<script setup lang="ts">
import Sidebar from '~/components/layouts/sidebar.vue';


</script>

<template>
    <SidebarProvider>
        <Sidebar />
        <SidebarInset>
            <div class="flex flex-col h-full">
                <LayoutsNavbar />
                <Separator />
                <slot class="overflow-y-auto" />
            </div>
        </SidebarInset>
    </SidebarProvider>
</template>