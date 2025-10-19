<script setup lang="ts">
import type { NuxtError } from "#app";
import { LoginRequestSchema } from "@music/api/dto/auth.dto"
import { toTypedSchema } from "@vee-validate/zod"
import { useForm } from "vee-validate"
import { startAuthentication, type PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';

const formSchema = toTypedSchema(LoginRequestSchema);

const form = useForm({
    validationSchema: formSchema,
});

const ws = useWs();

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
        ws.open();
        await navigateTo("/");
    } catch (error: unknown) {
        errorMessage.value = error as NuxtError;
    }
})

const startWebAuthLogin = async (e: Event) => {
    e.preventDefault();
    const options = await useNuxtApp().$backend<PublicKeyCredentialRequestOptionsJSON>('/auth/webauth/options-authentication');

    let asseResp;
    try {
        asseResp = await startAuthentication({ optionsJSON: options })
    } catch (err) {
        console.error(err);
        return;
    }

    const verificationResp = await useNuxtApp().$backend<{ verified: boolean }>('/auth/webauth/verify-authentication', {
        method: "POST",
        body: asseResp,
    });

    if (verificationResp.verified) {
        ws.open();
        await navigateTo("/");
    }
}

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
                    <FormItem>
                        <div class="grid gap-2">
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                                <Input type="text" placeholder="Enter your username" v-bind="componentField" required />
                            </FormControl>
                        </div>
                        <FormMessage class="mt-1" />
                    </FormItem>
                </FormField>
                <FormField v-slot="{ componentField }" name="password">
                    <FormItem>
                        <div class="grid gap-2">
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <Input type="password" v-bind="componentField" required />
                            </FormControl>
                        </div>
                        <FormMessage class="mt-1" />
                    </FormItem>
                </FormField>
                <CardFooter v-if="errorMessage" class="">
                    <p class="text-destructive text-sm mb-2">
                        {{ errorMessage.statusMessage || "An unknown error occurred" }}
                    </p>
                </CardFooter>
            </CardContent>
            <CardFooter class="flex flex-col gap-2 p-6 pt-0">
                <Button class="w-full">
                    Login
                </Button>
                <Button variant="outline" class="w-full" @click="startWebAuthLogin">
                    WebAuthhhhh PassKeyyyyyyyyyy
                </Button>
            </CardFooter>
        </form>
    </Card>
</template>