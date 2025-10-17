<script setup lang="ts">
import { Button } from '~/components/ui/button';
import { startRegistration, type PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser"

const startWebAuthRegistration = async () => {
    const options = await useNuxtApp().$backend<PublicKeyCredentialCreationOptionsJSON>('/auth/webauth/options-registration');

    let attResp;
    try {
        attResp = await startRegistration({ optionsJSON: options })
    } catch (err) {
        console.error(err);
        return;
    }


    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const verificationResp = await useNuxtApp().$backend<{ verified: boolean }>('/auth/webauth/verify-registration', {
        method: "POST",
        body: attResp,
    });

}

</script>

<template>
    <Button @click="startWebAuthRegistration">Click me</Button>
</template>