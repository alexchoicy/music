<script setup lang="ts">
import SimpleCard from "@/components/ui/card/SimpleCard.vue"
import SimpleButton from "@/components/ui/button/SimpleButton.vue"
import SimpleInput from "@/components/ui/input/SimpleInput.vue"
import SimpleLabel from "@/components/ui/label/SimpleLabel.vue"
</script>

<template>
  <SimpleCard class="w-full max-w-sm">
    <div class="p-6">
      <div class="space-y-2 text-center">
        <h1 class="text-2xl font-bold">Login - HMR Test</h1>
        <p class="text-muted-foreground">
          HMR is now working for Vue components in packages/ui!
        </p>
      </div>
      <div class="mt-4 space-y-4">
        <div class="space-y-2">
          <SimpleLabel for="email">Email Address</SimpleLabel>
          <SimpleInput id="email" type="email" placeholder="m@example.com" required />
        </div>
        <div class="space-y-2">
          <SimpleLabel for="password">Password</SimpleLabel>
          <SimpleInput id="password" type="password" required />
        </div>
        <SimpleButton class="w-full">
          Sign In Now!
        </SimpleButton>
      </div>
    </div>
  </SimpleCard>
</template>