<script setup lang="ts">
import { z } from 'zod/v4'
import { toTypedSchema } from "@vee-validate/zod";
import { useFieldArray, useForm } from 'vee-validate';
import { Plus, X } from 'lucide-vue-next';

import { type UploadMusic } from '@music/api/type/music';
import { nextTick, watch } from 'vue';

const props = defineProps({
    isOpen: {
        type: Boolean,
        required: true,
    },
    currentTrack: {
        type: Object as () => UploadMusic,
        required: true,
    },
    reSortAlbums: {
        type: Function,
        required: true,
    }
})

const emit = defineEmits(['update:isOpen', 'update:currentTrack']);

watch(() => [props.currentTrack, props.isOpen], async ([currentTrack, isOpen]) => {
    if (!isOpen || !currentTrack) return;
    await nextTick();
    if (typeof currentTrack === 'object' && currentTrack !== null) {
        trackForm.resetForm({
            values: {
                title: currentTrack.title === "Unknown Title" ? '' : currentTrack.title,
                albumArtist: currentTrack.albumArtist === "Unknown Album Artist" ? '' : currentTrack.albumArtist,
                artists: currentTrack.artists.length > 0 ? [...currentTrack.artists] : [''],
                album: currentTrack.album === "Unknown Album" ? '' : currentTrack.album,
                year: currentTrack.year > 1900 ? currentTrack.year : undefined,
                trackNo: currentTrack.track.no > 0 ? currentTrack.track.no : undefined,
                discNo: currentTrack.disc.no > 0 ? currentTrack.disc.no : undefined,
                isInstrumental: currentTrack.isInstrumental || false,
                isMC: currentTrack.isMC || false,
            }
        });
    }
}, { immediate: true })

const trackEditFormSchema = toTypedSchema(z.object({
    title: z.string().optional(),
    albumArtist: z.string().optional(),
    artists: z.array(z.string()).min(1, "At least one artist is required"),
    album: z.string().optional(),
    year: z.number().min(1900).max(new Date().getFullYear()).optional(),
    trackNo: z.number().min(1).optional(),
    discNo: z.number().min(1).optional(),
    // genre: z.string().optional(),
    isInstrumental: z.boolean().optional(),
    isMC: z.boolean().optional(),
}));

const trackForm = useForm({
    validationSchema: trackEditFormSchema,
    initialValues: {
        title: '',
        albumArtist: '',
        artists: [''],
        album: '',
    },
})

const { fields: artistsFields, remove: artistsFieldsRemove, push: artistsFieldsPush } = useFieldArray<string>('artists');

function onRemoveArtist(idx: number) {
    if (artistsFields.value.length > 1) artistsFieldsRemove(idx)
}

function onAddArtist() {
    artistsFieldsPush('')
}

function handleAlbumEditDialogOpenChange(open: boolean) {
    if (!open) {
        emit('update:currentTrack', null);
        trackForm.resetForm();
    }
    emit('update:isOpen', open);
}

const onTrackFormSubmit = trackForm.handleSubmit(async (values) => {
    props.currentTrack.title = values.title || "Unknown Title"
    props.currentTrack.albumArtist = values.albumArtist || "Unknown Album Artist";

    const artistsSet = new Set<string>();
    values.artists.forEach(artist => {
        const trimmed = artist.trim();
        if (trimmed) artistsSet.add(trimmed);
    });
    if (artistsSet.size === 0) artistsSet.add("Unknown Artist");
    props.currentTrack.artists = Array.from(artistsSet);


    props.currentTrack.album = values.album || "Unknown Album";
    props.currentTrack.year = values.year || 0;
    props.currentTrack.track.no = values.trackNo || 0;
    props.currentTrack.disc.no = values.discNo || 0;
    props.currentTrack.isInstrumental = values.isInstrumental || false;
    props.currentTrack.isMC = values.isMC || false;

    await props.reSortAlbums();

    emit('update:currentTrack', null);
    emit('update:isOpen', false);
    trackForm.resetForm();
})

</script>

<template>
    <Dialog :open="isOpen" @update:open="handleAlbumEditDialogOpenChange">
        <DialogScrollContent>
            <DialogHeader>
                <DialogTitle>Edit Track metadata</DialogTitle>
                <DialogDescription>
                    the metadata editing will not effect the original file. (yet) i think tehe.
                </DialogDescription>
            </DialogHeader>
            <form @submit="onTrackFormSubmit" class="space-y-4">
                <FormField v-slot="{ componentField }" name="title">
                    <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                            <Input type="text" v-bind="componentField"></Input>
                        </FormControl>
                    </FormItem>
                </FormField>
                <FormField v-slot="{ componentField }" name="albumArtist">
                    <FormItem>
                        <FormLabel>Album Artists</FormLabel>
                        <FormControl>
                            <Input type="text" v-bind="componentField" placeholder="Empty if unknown."></Input>
                        </FormControl>
                        <FormDescription>
                            The Main artist for the album. All track should have the same album artist.
                        </FormDescription>
                    </FormItem>
                </FormField>
                <FormField v-for="(artistField, index) in artistsFields" :key="artistField.key"
                    :name="`artists.${index}`" v-slot="{ componentField }">
                    <FormItem>
                        <FormLabel>Artist {{ index + 1 }}</FormLabel>
                        <FormControl>
                            <div class="flex items-center gap-2">
                                <Input type="text" v-bind="componentField"></Input>
                                <Button v-if="artistsFields.length > 1" type="button" variant="ghost" size="sm"
                                    class="h-9 w-9 p-0 hover:bg-red-900/20 hover:text-red-400"
                                    @click="onRemoveArtist(index)" title="Remove">
                                    <X class="h-4 w-4" />
                                </Button>
                            </div>
                        </FormControl>
                    </FormItem>
                </FormField>
                <Button variant="ghost"
                    class="w-full h-8 text-gray-400 hover:text-white hover:bg-gray-800 border border-dashed border-gray-700 hover:border-gray-600"
                    @click="onAddArtist" type="button">
                    <Plus class="h-4 w-4 mr-2" />
                    Add Artist
                </Button>
                <FormField v-slot="{ componentField }" name="album">
                    <FormItem>
                        <FormLabel>Album</FormLabel>
                        <FormControl>
                            <Input type="text" v-bind="componentField"></Input>
                        </FormControl>
                        <FormDescription>
                            All track should have the same album name.
                        </FormDescription>
                    </FormItem>
                </FormField>
                <div class="grid grid-cols-3 gap-3">
                    <FormField v-slot="{ componentField }" name="year">
                        <FormItem>
                            <FormLabel>Year</FormLabel>
                            <FormControl>
                                <Input type="number" v-bind="componentField"></Input>
                            </FormControl>
                        </FormItem>
                    </FormField>
                    <FormField v-slot="{ componentField }" name="discNo">
                        <FormItem>
                            <FormLabel>Disc No.</FormLabel>
                            <FormControl>
                                <Input type="number" v-bind="componentField"></Input>
                            </FormControl>
                        </FormItem>
                    </FormField>
                    <FormField v-slot="{ componentField }" name="trackNo">
                        <FormItem>
                            <FormLabel>Track No.</FormLabel>
                            <FormControl>
                                <Input type="number" v-bind="componentField"></Input>
                            </FormControl>
                        </FormItem>
                    </FormField>
                </div>
                <FormField v-slot="{ value, handleChange }" type="checkbox" name="isInstrumental">
                    <FormItem class="flex flex-row items-start gap-x-3 space-y-0 rounded-md border p-4 shadow">
                        <FormControl>
                            <Checkbox :model-value="value" @update:model-value="handleChange" />
                        </FormControl>
                        <div class="space-y-1 leading-none">
                            <FormLabel>Is Instrumental</FormLabel>
                            <FormDescription>
                                Don't apply if it is part of a compilation album.
                            </FormDescription>
                            <FormMessage />
                        </div>
                    </FormItem>
                </FormField>
                <FormField v-slot="{ value, handleChange }" type="checkbox" name="isMC">
                    <FormItem class="flex flex-row items-start gap-x-3 space-y-0 rounded-md border p-4 shadow">
                        <FormControl>
                            <Checkbox :model-value="value" @update:model-value="handleChange" />
                        </FormControl>
                        <div class="space-y-1 leading-none">
                            <FormLabel>Is MC</FormLabel>
                            <FormDescription>
                                Check this if the track is a MC (Master of Ceremony) part.
                            </FormDescription>
                            <FormMessage />
                        </div>
                    </FormItem>
                </FormField>
                <Button type="submit" class="w-full">Save Changes</Button>
            </form>
        </DialogScrollContent>
    </Dialog>
</template>