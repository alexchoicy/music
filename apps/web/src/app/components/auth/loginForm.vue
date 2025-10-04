<script setup lang="ts">
import { LoginRequestSchema } from "@music/api/dto/auth.dto"
import { toTypedSchema } from "@vee-validate/zod"
import { useForm } from "vee-validate"

const formSchema = toTypedSchema(LoginRequestSchema);

const form = useForm({
    validationSchema: formSchema,
});

const onFormSubmit = form.handleSubmit(async (values) => {
    await useNuxtApp().$backend("/auth/login", {
        method: "POST",
        body: {
            username: values.username,
            password: values.password,
        },
    });

    await navigateTo("/");
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
                        <Label for="username">Username</Label>
                        <Input id="username" type="text" placeholder="Enter your username" v-bind="componentField"
                            required />
                    </div>
                </FormField>
                <FormField v-slot="{ componentField }" name="password">
                    <div class="grid gap-2">
                        <Label for="password">Password</Label>
                        <Input id="password" type="password" v-bind="componentField" required />
                    </div>
                </FormField>
            </CardContent>
            <CardFooter>
                <Button class="w-full">
                    Login
                </Button>
            </CardFooter>
        </form>
    </Card>
</template>