<script setup lang="ts">
import { Album } from 'lucide-vue-next';

</script>

<template>
    <Sidebar>
        <SidebarContent>
            <SidebarGroup>
                <SidebarGroupLabel>
                    Find Music
                </SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem :key="'albums'">
                            <SidebarMenuButton as-child>
                                <NuxtLink to="/music/albums">
                                    <Album class="w-5 h-5 mr-2" />
                                    Albums
                                </NuxtLink>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarContent>
    </Sidebar>
</template>