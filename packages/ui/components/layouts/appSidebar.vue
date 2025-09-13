<script setup lang="ts">
import { Album, User } from 'lucide-vue-next';

</script>

<template>
    <Sidebar>
        <SidebarHeader>
            <NuxtLink to="/" class="text-2xl font-bold items-center flex justify-center">
                Music
            </NuxtLink>
        </SidebarHeader>
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
                        <SidebarMenuItem :key="'artists'">
                            <SidebarMenuButton as-child>
                                <NuxtLink to="/music/artists">
                                    <User class="w-5 h-5 mr-2" />
                                    Artists
                                </NuxtLink>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarContent>
    </Sidebar>
</template>