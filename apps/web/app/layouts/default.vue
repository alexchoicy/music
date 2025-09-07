<script setup lang="ts">
import Navbar from '@/components/layouts/navbar.vue';
</script>

<template>
    <SidebarProvider>
        <Sidebar>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarMenu>
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
        <SidebarInset>
            <Navbar />
            <Separator />
            <slot />
        </SidebarInset>
    </SidebarProvider>
</template>