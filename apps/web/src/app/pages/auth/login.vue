<script setup lang="ts">
import { useAuthUser } from "#imports";

definePageMeta({
    public: true,
    layout: false,
});

const authUser = useAuthUser();

if (authUser.value) {
    await navigateTo("/");
}


</script>

<template>
    <div class="relative min-h-svh flex-col bg-background w-full h-screen flex items-center justify-center px-4">
        <AuthLoginForm />
    </div>

</template>