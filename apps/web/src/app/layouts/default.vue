<script setup lang="ts">
  import Sidebar from "~/components/layouts/sidebar.vue";
  import AudioPlayer from "~/components/music/audioPlayer.vue";

  import { SplitterGroup, SplitterPanel } from "reka-ui";

  const isBot = useIsBot();

  const currentPlayListRef = ref<InstanceType<typeof SplitterPanel> | null>(null);

  function showCurrentPlayList() {
    if (!currentPlayListRef.value) return;

    if (currentPlayListRef.value.isCollapsed) {
      currentPlayListRef.value.expand();
    } else {
      currentPlayListRef.value.collapse();
    }
  }

  onMounted(async () => {
    await nextTick();
    currentPlayListRef.value?.collapse();
  });
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
          <SplitterGroup direction="horizontal">
            <SplitterPanel class="p-6 overflow-y-auto size-full flex-1" :default-size="100">
              <slot />
            </SplitterPanel>
            <ResizableHandle />
            <SplitterPanel ref="currentPlayListRef" :min-size="20" collapsible>
              <MusicCurrentPlayList />
            </SplitterPanel>
          </SplitterGroup>
          <AudioPlayer
            :toggle-play-list="showCurrentPlayList"
            :is-collapsed="currentPlayListRef?.isCollapsed || false" />
        </div>
        <SearchCMD />
      </SidebarInset>
    </SidebarProvider>
  </TooltipProvider>
</template>
