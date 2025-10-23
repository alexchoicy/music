<script setup lang="ts">
  import type { TrackQualityType } from "@music/api/dto/album.dto";
  import { Settings } from "lucide-vue-next";

  const qualityOptions = ref<TrackQualityType>("original");

  const audioPlayer = useAudioPlayer();

  onMounted(() => {
    qualityOptions.value = audioPlayer.quality;
  });

  watch(qualityOptions, (newVal) => {
    audioPlayer.quality = newVal;
  });

  const setQuality = (quality: TrackQualityType) => {
    qualityOptions.value = quality;
  };
</script>

<template>
  <Sheet>
    <SheetTrigger as-child>
      <Button variant="ghost">
        <Settings />
      </Button>
    </SheetTrigger>
    <SheetContent>
      <SheetHeader class="border-b-2">
        <SheetTitle>Playback Settings</SheetTitle>
        <SheetDescription>Adjust your audio playback preferences.</SheetDescription>
      </SheetHeader>
      <div class="flex p-3 flex-col">
        <div>
          <h3 class="text-sm font-semibold mb-3">Audio Quality</h3>
          <RadioGroup v-model="qualityOptions">
            <Item
              variant="outline"
              class="hover:cursor-pointer hover:bg-accent dark:hover:bg-accent/50"
              @click="setQuality('original')">
              <ItemContent>
                <ItemTitle>Original</ItemTitle>
                <ItemDescription>source audio</ItemDescription>
              </ItemContent>
              <ItemActions>
                <RadioGroupItem value="original" />
              </ItemActions>
            </Item>
            <Item
              variant="outline"
              class="hover:cursor-pointer hover:bg-accent dark:hover:bg-accent/50"
              @click="setQuality('transcoded_opus_112k')">
              <ItemContent>
                <ItemTitle>Standard (Opus 112 kbps)</ItemTitle>
                <ItemDescription>Encoded to Opus 112 kbps. High Quality but low bandwidth usage.</ItemDescription>
              </ItemContent>
              <ItemActions>
                <RadioGroupItem value="transcoded_opus_112k" />
              </ItemActions>
            </Item>
          </RadioGroup>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>
