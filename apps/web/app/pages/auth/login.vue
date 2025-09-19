<script setup lang="ts">
import Login from "@music/ui/components/auth/Login.vue";

definePageMeta({
    public: true,
    layout: false
})



async function login(username: string, password: string) {
    const apiBase = useRuntimeConfig().public.apiBase;
    await $fetch(apiBase + '/auth/login', {
        method: 'POST',
        body: {
            username,
            password
        },
        credentials: 'include',
    });

    await navigateTo('/');

}
</script>

<template>
    <Login :onLogin="login" />
</template>