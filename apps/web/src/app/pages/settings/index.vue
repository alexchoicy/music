<script setup lang="ts">
  import { Fingerprint, Users } from "lucide-vue-next";
  import { cn } from "~/lib/utils";

  const section = ref("webauth");

  const user = useAuthUser();

  const isAdmin = computed(() => user?.value?.info.role === "admin");
</script>

<template>
  <div class="flex flex-col gap-8 lg:flex-row">
    <nav class="w-full lg:w-64">
      <div class="space-y-1">
        <button
          :class="
            cn(
              'flex w-full items-start gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:cursor-pointer',
              section === 'webauth'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent hover:text-accent-foreground',
            )
          "
          @click="section = 'webauth'">
          <Fingerprint class="mt-0.5 h-5 w-5 shrink-0" />
          <div class="flex-1 space-y-0.5">
            <div class="flex items-center gap-2">
              <span class="font-medium">Web Authentication</span>
            </div>
          </div>
        </button>
        <button
          v-if="isAdmin"
          :class="
            cn(
              'flex w-full items-start gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:cursor-pointer',
              section === 'accounts'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent hover:text-accent-foreground',
            )
          "
          @click="section = 'accounts'">
          <Users class="mt-0.5 h-5 w-5 shrink-0" />
          <div class="flex-1 space-y-0.5">
            <div class="flex items-center gap-2">
              <span class="font-medium">Users Management</span>
            </div>
          </div>
        </button>
      </div>
    </nav>

    <div class="flex-1">
      <settings-admin-users v-if="section === 'accounts' && isAdmin" />
      <settings-webauth v-else-if="section === 'webauth'" />
    </div>
  </div>
</template>
