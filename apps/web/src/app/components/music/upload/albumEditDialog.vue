<script setup lang="ts">
  import {
    AlbumsAlbumTypeEnum,
    type UploadAlbum,
    type AlbumsAlbumType,
    ArtistsArtistType,
    type ArtistType,
  } from "@music/api/type/music";
  import { z } from "zod/v4";
  import { toTypedSchema } from "@vee-validate/zod";
  import { useForm } from "vee-validate";
  import { useDropZone } from "@vueuse/core";
  import { Disc3, X } from "lucide-vue-next";
  import { nextTick, ref, watch } from "vue";
  import { getBase64FromFile, getAlbumHash } from "~/lib/music/uploadUtils";

  const props = defineProps({
    isOpen: {
      type: Boolean,
      required: true,
    },
    currentAlbum: {
      type: Object as () => UploadAlbum,
      required: true,
    },
  });

  const emit = defineEmits(["update:isOpen", "update:currentAlbum"]);

  const dropZoneRef = ref<HTMLDivElement>();
  const newImage = ref<{
    data: string | undefined;
    format: "image/jpeg" | "image/png" | undefined;
  }>({ data: undefined, format: undefined });

  watch(
    () => [props.currentAlbum, props.isOpen],
    async ([currentAlbum, isOpen]) => {
      if (!isOpen || !currentAlbum) return;

      await nextTick();
      albumEditForm.resetForm({
        values: {
          name: props.currentAlbum.name === "Unknown Album" ? "" : props.currentAlbum.name,
          albumArtist: props.currentAlbum.albumArtist === "Unknown Album Artist" ? "" : props.currentAlbum.albumArtist,
          albumType: props.currentAlbum.albumType || "Album",
          picture: {
            data: props.currentAlbum?.disc[0]!.musics?.[0]?.picture?.[0]?.data || undefined,
            format:
              (props.currentAlbum?.disc[0]!.musics?.[0]?.picture?.[0]?.format as "image/jpeg" | "image/png") ||
              undefined,
          },
        },
      });
    },
    { immediate: true },
  );

  const albumEditSchema = toTypedSchema(
    z.object({
      picture: z
        .object({
          data: z.string().optional(),
          format: z.enum(["image/jpeg", "image/png"]).optional(),
        })
        .optional(),
      name: z.string().optional(),
      albumType: AlbumsAlbumTypeEnum,
      albumArtist: z.string().optional(),
      artistType: ArtistsArtistType,
    }),
  );

  const albumEditForm = useForm({
    validationSchema: albumEditSchema,
    initialValues: {
      name: "",
      albumArtist: "",
      albumType: "Album",
      artistType: "person",
      picture: undefined,
    },
  });

  function handleAlbumEditDialogOpenChange(open: boolean) {
    if (!open) {
      emit("update:currentAlbum", null);
      albumEditForm.resetForm();
    }
    emit("update:isOpen", open);
  }

  useDropZone(dropZoneRef, {
    onDrop: async (file) => {
      if (!file || !file[0] || !["image/jpeg", "image/png"].includes(file[0].type)) return;
      newImage.value = {
        data: await getBase64FromFile(file[0]),
        format: file[0].type as "image/jpeg" | "image/png",
      };
    },
    dataTypes: ["image/jpeg", "image/png"],
    multiple: false,
  });

  function removeNewImage() {
    newImage.value = { data: undefined, format: undefined };
  }

  const onAlbumEditSubmit = albumEditForm.handleSubmit(async (values) => {
    const updateImage = newImage.value.data && newImage.value.format;

    for (const disc of props.currentAlbum.disc) {
      for (const track of disc.musics) {
        if (updateImage) {
          track.picture = [
            {
              data: newImage.value.data as string,
              format: newImage.value.format as "image/jpeg" | "image/png",
            },
          ];
        }
        track.album = values.name || "Unknown Album";
        track.albumArtist = values.albumArtist || "Unknown Album Artist";
      }
    }

    props.currentAlbum.name = values.name || "Unknown Album";
    props.currentAlbum.albumArtist = values.albumArtist || "Unknown Album Artist";
    props.currentAlbum.albumType = values.albumType;
    props.currentAlbum.hash = await getAlbumHash(props.currentAlbum.name + props.currentAlbum.albumArtist);
    props.currentAlbum.artistsType = values.artistType;

    emit("update:isOpen", false);
    emit("update:currentAlbum", null);
    albumEditForm.resetForm();
  });

  const albumTypeOptions: { value: AlbumsAlbumType; label: string }[] = AlbumsAlbumTypeEnum.options.map((v) => ({
    value: v,
    label: v,
  }));

  const artistTypeOptions: { value: ArtistType; label: string }[] = ArtistsArtistType.options.map((v) => ({
    value: v,
    label: v,
  }));
</script>

<template>
  <Dialog :open="isOpen" @update:open="handleAlbumEditDialogOpenChange">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit Album</DialogTitle>
        <DialogDescription>Edit the details of the album. Will apply to all tracks</DialogDescription>
      </DialogHeader>
      <form class="space-y-6 py-4" @submit="onAlbumEditSubmit">
        <FormField v-slot="{}" name="picture">
          <FormItem>
            <FormLabel>Album Cover</FormLabel>
            <FormControl>
              <div class="flex items-center gap-4">
                <div ref="dropZoneRef" class="relative w-24 h-24 rounded-lg border-2 border-dashed">
                  <div v-if="newImage.data && newImage.format" class="w-full h-full">
                    <img
                      :src="`data:${newImage.format};base64,${newImage.data}`"
                      class="w-full h-full object-cover rounded-lg" />
                    <button
                      class="absolute cursor-pointer -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-colors"
                      @click="removeNewImage">
                      <X class="h-3 w-3 text-white" />
                    </button>
                  </div>
                  <img
                    v-else-if="currentAlbum?.disc[0]!.musics[0] && currentAlbum?.disc[0].musics?.[0]?.picture?.[0]"
                    :src="`data:${currentAlbum?.disc[0].musics?.[0]?.picture?.[0]?.format};base64,${currentAlbum?.disc[0].musics?.[0]?.picture?.[0]?.data}`"
                    class="w-full h-full object-cover rounded-lg" />
                  <div v-else class="w-full h-full bg-gray-700 flex items-center justify-center rounded-lg">
                    <Disc3 class="h-8 w-8 text-gray-400" />
                  </div>
                </div>
                <div class="flex-1">
                  <div class="flex gap-2">
                    <Input
                      id="cover-upload"
                      type="file"
                      multiple
                      accept="image/jpeg, image/png"
                      class="hidden"
                      @change="
                        async (e: Event) => {
                          const target = e.target as HTMLInputElement;
                          if (target.files && target.files.length > 0) {
                            const file = target.files;
                            if (!file || !file[0] || !['image/jpeg', 'image/png'].includes(file[0].type)) return;
                            newImage = {
                              data: await getBase64FromFile(file[0]),
                              format: file[0].type as 'image/jpeg' | 'image/png',
                            };
                          }
                        }
                      " />
                    <Button as-child type="button">
                      <Label for="cover-upload">Upload Image</Label>
                    </Button>
                  </div>
                  <FormDescription>Supported formats: JPEG, PNG</FormDescription>
                </div>
              </div>
            </FormControl>
          </FormItem>
        </FormField>
        <FormField v-slot="{ field }" name="name">
          <FormItem>
            <FormLabel>Album Name</FormLabel>
            <FormControl>
              <Input v-bind="field" placeholder="Album Name" />
            </FormControl>
          </FormItem>
        </FormField>
        <div class="grid grid-cols-3">
          <FormField v-slot="{ componentField }" name="albumType">
            <FormItem>
              <FormLabel>Album Type</FormLabel>
              <Select v-bind="componentField" :default-value="currentAlbum?.albumType || 'Album'">
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Select Album Type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem v-for="option in albumTypeOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FormItem>
          </FormField>
        </div>
        <FormField v-slot="{ field }" name="albumArtist">
          <FormItem>
            <FormLabel>Album Artist</FormLabel>
            <FormControl>
              <Input v-bind="field" placeholder="Album Artist" />
            </FormControl>
          </FormItem>
        </FormField>
        <div class="grid grid-cols-3">
          <FormField v-slot="{ componentField }" name="artistType">
            <FormItem>
              <FormLabel>Artist Type</FormLabel>
              <Select v-bind="componentField" :default-value="currentAlbum?.artistsType || 'person'">
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Select Artist Type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem v-for="option in artistTypeOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FormItem>
          </FormField>
        </div>
        <Button type="submit" class="w-full">Save Changes</Button>
      </form>
    </DialogContent>
  </Dialog>
</template>
