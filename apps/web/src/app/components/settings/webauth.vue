<script setup lang="ts">
import type { WebAuthDeviceDTO } from "@music/api/dto/auth.dto";
import { startRegistration, type PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser"
import { Key, ShieldQuestionMark, Smartphone, Trash } from "lucide-vue-next";

const name = ref<string>("");

const isDialogOpen = ref(false);
const selectedDevice = ref<WebAuthDeviceDTO | null>(null);

const startWebAuthRegistration = async () => {
    if (!name.value) {
        alert("Please enter a name for the authenticator.");
        return;
    }

    const options = await useNuxtApp().$backend<PublicKeyCredentialCreationOptionsJSON>('/auth/webauth/options-registration');

    let attResp;
    try {
        attResp = await startRegistration({ optionsJSON: options })
    } catch (err) {
        console.error(err);
        return;
    }

    const verificationResp = await useNuxtApp().$backend<{ verified: boolean, newDeviceId: string }>('/auth/webauth/verify-registration', {
        method: "POST",
        body: attResp,
    });

    if (verificationResp.verified) {
        await useNuxtApp().$backend('/auth/webauth/name', {
            method: "PUT",
            body: {
                id: verificationResp.newDeviceId,
                name: name.value,
            },
        });
    }
    devices.refresh();
}

const devices = useAPI<WebAuthDeviceDTO[]>('/auth/webauth/devices');

enum AuthTypeIcon {
    DEVICE,
    KEY,
    UNKNOWN,
}

function getAuthTypeIcon(device: string[], deviceType: string): AuthTypeIcon {
    const isDevice = device.includes('platform') || device.includes('internal') || deviceType.toLowerCase() === 'multiDevice';
    const isKey =
        deviceType.toLowerCase() === 'singledevice' ||
        device.some((transport) => ['usb', 'nfc', 'ble'].includes(transport.toLowerCase()));

    if (isDevice) {
        return AuthTypeIcon.DEVICE;
    } else if (isKey) {
        return AuthTypeIcon.KEY;
    } else {
        return AuthTypeIcon.UNKNOWN;
    }
}

function formatDate(date: Date): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

async function removeDevice(deviceId: string) {
    await useNuxtApp().$backend(`/auth/webauth/device/${deviceId}`, {
        method: 'DELETE',
    });
    devices.refresh();
}

function openDialog(device: WebAuthDeviceDTO) {
    selectedDevice.value = device;
    isDialogOpen.value = true;
}

function confirmRemove() {
    if (selectedDevice.value) {
        removeDevice(selectedDevice.value.id)
    }
    isDialogOpen.value = false
}
</script>

<template>
    <div class="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>WebAuthn Registration</CardTitle>
                <CardDescription>
                    Register a WebAuthn authenticator for passwordless login.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div class="space-y-2">
                    <Label for="name">WebAuthn Registration</Label>
                    <Input id="name" v-model="name" type="text" />
                </div>
                <Button class="mt-4" @click="startWebAuthRegistration">
                    Register WebAuthn Authenticator
                </Button>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Your Credentials</CardTitle>
                <CardDescription>Manage your registered WebAuthn credentials</CardDescription>
            </CardHeader>
            <CardContent>
                <div v-if="devices.data.value?.length === 0">
                    <p>No WebAuthn devices registered.</p>
                </div>
                <Item v-for="device in devices.data.value" v-else :key="device.id">
                    <ItemMedia>
                        <Smartphone
                            v-if="getAuthTypeIcon(device.device || [], device.deviceType) === AuthTypeIcon.DEVICE" />
                        <Key v-else-if="getAuthTypeIcon(device.device || [], device.deviceType) === AuthTypeIcon.KEY" />
                        <ShieldQuestionMark v-else />
                    </ItemMedia>
                    <ItemContent>
                        <ItemTitle>{{ device.name }}</ItemTitle>
                        <ItemDescription>
                            Registered on: {{ formatDate(new Date(device.createdAt)) }}
                            <span v-if="device.lastUsedAt">
                                | Last used: {{ formatDate(new Date(device.lastUsedAt)) }}
                            </span>
                        </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                        <Button variant="ghost" size="sm" @click="openDialog(device)">
                            <Trash />
                        </Button>
                    </ItemActions>
                </Item>
            </CardContent>
        </Card>

        <AlertDialog v-model:open="isDialogOpen">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to remove this WebAuthn device? This action cannot be undone.
                        <br>
                        Device ID: {{ selectedDevice?.id }} <br>
                        Device Name: {{ selectedDevice?.name }} <br>
                        Device Type: {{ selectedDevice?.deviceType }} <br>
                        Device: {{ selectedDevice?.device?.join(', ') }} <br>
                        Created At: {{ selectedDevice ? formatDate(new Date(selectedDevice.createdAt)) : '' }} <br>
                        <span v-if="selectedDevice?.lastUsedAt">
                            Last Used At: {{ selectedDevice ? formatDate(new Date(selectedDevice.lastUsedAt)) : '' }}
                        </span>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction @click="confirmRemove">Confirm</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
</template>