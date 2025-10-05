<script setup lang="ts">
import type { NuxtError } from "#app";
import { LoginRequestSchema } from "@music/api/dto/auth.dto"
import { toTypedSchema } from "@vee-validate/zod"
import { useForm } from "vee-validate"

const formSchema = toTypedSchema(LoginRequestSchema);

const form = useForm({
    validationSchema: formSchema,
});

const errorMessage = ref<NuxtError | null>(null);

const onFormSubmit = form.handleSubmit(async (values) => {
    try {
        await useNuxtApp().$backend("/auth/login", {
            method: "POST",
            body: {
                username: values.username,
                password: values.password,
            },
        });
        await navigateTo("/");
    } catch (error: any) {
        errorMessage.value = error;
    }
})
</script>

<template>
    <Card class="w-full max-w-sm">
        <form @submit="onFormSubmit">
            <CardHeader>
                <CardTitle class="text-2xl">
                    Login
                </CardTitle>
            </CardHeader>
            <CardContent class="grid gap-4 p-6">
                <FormField v-slot="{ componentField }" name="username">
                    <div class="grid gap-2">
                        <FormLabel for="username">Username</FormLabel>
                        <FormControl>
                            <Input id="username" type="text" placeholder="Enter your username" v-bind="componentField"
                                required />
                        </FormControl>
                    </div>
                    <FormMessage class="mt-1" />
                </FormField>
                <FormField v-slot="{ componentField }" name="password">
                    <div class="grid gap-2">
                        <FormLabel for="password">Password</FormLabel>
                        <FormControl>
                            <Input id="password" type="password" v-bind="componentField" required />
                        </FormControl>
                    </div>
                    <FormMessage class="mt-1" />
                </FormField>
                <CardFooter v-if="errorMessage" class="">
                    <p class="text-destructive text-sm mb-2">
                        {{ errorMessage.statusMessage || "An unknown error occurred" }}
                    </p>
                </CardFooter>
            </CardContent>
            <CardFooter>
                <Button class="w-full">
                    Login
                </Button>
            </CardFooter>
        </form>
    </Card>
</template>