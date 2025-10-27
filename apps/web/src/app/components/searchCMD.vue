<script setup lang="ts">
  import { Search } from "lucide-vue-next";
  import { useMagicKeys, watchDebounced } from "@vueuse/core";
  import { CommandDialog, CommandInput } from "./ui/command";
  import type { SearchDTO } from "@music/api/dto/search.dto";
  import type { ListboxFilterProps } from "reka-ui";
  import { reactiveOmit } from "@vueuse/core";
  import { ListboxFilter, useForwardProps } from "reka-ui";
  import type { HTMLAttributes } from "vue";
  import { cn } from "@/lib/utils";
  import { useSearchCMD } from "~/composables/useSearchCMD";

  const { state, toggle } = useSearchCMD();

  const { ctrl_k } = useMagicKeys({
    passive: false,
    onEventFired(e) {
      if (e.key === "k" && e.ctrlKey) e.preventDefault();
    },
  });

  watch(ctrl_k!, (v) => {
    if (v) handleOpenChange();
  });

  function handleOpenChange() {
    if (!state.value) {
      searchTerm.value = "";
      data.value = undefined;
    }
    toggle();
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

  const props = defineProps<
    ListboxFilterProps & {
      class?: HTMLAttributes["class"];
    }
  >();

  const delegatedProps = reactiveOmit(props, "class");

  const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <CommandDialog :open="state" @update:open="handleOpenChange">
    <div data-slot="command-input-wrapper" class="flex h-12 items-center gap-2 border-b px-3">
      <Search class="size-4 shrink-0 opacity-50" />
      <ListboxFilter
        v-bind="{ ...forwardedProps, ...$attrs }"
        v-model="searchTerm"
        data-slot="command-input"
        auto-focus
        :class="
          cn(
            'placeholder:text-muted-foreground flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
            props.class,
          )
        " />
    </div>
    <CommandList v-if="data">
      <CommandGroup v-if="data.albums.length" heading="Albums">
        <CommandItem as-child v-for="album in data.albums" :key="album.albumID" :value="album.title">
          <Item as-child>
            <a :href="`/music/albums/${album.albumID}`">
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
            </a>
          </Item>
        </CommandItem>
      </CommandGroup>
      <CommandGroup v-if="data.artists.length" heading="Artists">
        <CommandItem as-child v-for="artist in data.artists" :key="artist.artistID" :value="artist.name">
          <Item as-child>
            <a :href="`/music/artists/${artist.artistID}`">
              <ItemMedia variant="image">
                <img v-if="artist.imageUrl" :src="artist.imageUrl" class="object-cover" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>
                  {{ artist.name }}
                </ItemTitle>
                <ItemDescription>No of Album: {{ artist.albumCount }}</ItemDescription>
              </ItemContent>
            </a>
          </Item>
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </CommandDialog>
</template>
