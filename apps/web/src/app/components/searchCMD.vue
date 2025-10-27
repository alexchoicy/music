<script setup lang="ts">
  import { Search } from "lucide-vue-next";
  import { useMagicKeys, watchDebounced } from "@vueuse/core";
  import { CommandDialog } from "./ui/command";
  import type { SearchDTO } from "@music/api/dto/search.dto";
  import { ListboxFilter } from "reka-ui";
  import { cn } from "@/lib/utils";
  import { useSearchCMD } from "~/composables/useSearchCMD";
  import { Primitive } from "reka-ui";

  const { state, toggle } = useSearchCMD();

  const { ctrl_k } = useMagicKeys({
    passive: false,
    onEventFired(e) {
      if (e.key === "k" && e.ctrlKey) e.preventDefault();
    },
  });

  watch(ctrl_k!, (v) => {
    if (v) handleOpenChange(true);
  });

  function handleOpenChange(next: boolean) {
    if (!state.value) {
      searchTerm.value = "";
      data.value = undefined;
    }
    state.value = next;
  }

  const searchTerm = ref("");

  const data = ref<SearchDTO>();
  const loading = ref(false);

  watchDebounced(
    searchTerm,
    async (newTerm) => {
      if (!newTerm) {
        data.value = undefined;
        return;
      }

      loading.value = true;
      try {
        data.value = await useNuxtApp().$backend<SearchDTO>("search", {
          query: { text: newTerm },
        });
      } finally {
        loading.value = false;
      }
    },
    { debounce: 500, immediate: false },
  );

  function handleSelect(href: string) {
    useNuxtApp().$router.push(href);
    handleOpenChange(false);
  }
</script>

<template>
  <CommandDialog :open="state" @update:open="handleOpenChange">
    <div data-slot="command-input-wrapper" class="flex h-12 items-center gap-2 border-b px-3">
      <!-- copy from CommandInput -->
      <Search class="size-4 shrink-0 opacity-50" />
      <ListboxFilter
        v-model="searchTerm"
        auto-focus
        :class="
          cn(
            'placeholder:text-muted-foreground flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
          )
        " />
    </div>
    <CommandList v-if="data">
      <!-- i just copy from orginal CommandEmpty -->
      <Primitive v-if="!data.albums.length && !data.artists.length && !loading" :class="cn('py-6 text-center text-sm')">
        No results found.
      </Primitive>
      <Primitive v-if="loading" :class="cn('flex py-6 justify-center')">
        <Spinner />
      </Primitive>
      <CommandGroup v-if="data.albums.length" heading="Albums">
        <CommandItem
          as-child
          v-for="album in data.albums"
          :key="album.albumID"
          :value="album.title"
          @click="handleSelect(`/music/albums/${album.albumID}`)">
          <Item>
            <ItemMedia variant="image" class="m-auto">
              <img v-if="album.imageUrl" :src="album.imageUrl" class="object-cover" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>
                {{ album.title }}
              </ItemTitle>
              <ItemDescription>
                {{ album.artistName }}
              </ItemDescription>
            </ItemContent>
          </Item>
        </CommandItem>
      </CommandGroup>
      <CommandGroup v-if="data.artists.length" heading="Artists">
        <CommandItem
          as-child
          v-for="artist in data.artists"
          :key="artist.artistID"
          :value="artist.name"
          @click="handleSelect(`/music/artists/${artist.artistID}`)">
          <Item>
            <ItemMedia variant="image">
              <img v-if="artist.imageUrl" :src="artist.imageUrl" class="object-cover" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>
                {{ artist.name }}
              </ItemTitle>
              <ItemDescription>No of Album: {{ artist.albumCount }}</ItemDescription>
            </ItemContent>
          </Item>
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </CommandDialog>
</template>
