<script setup lang="ts">
  defineProps({
    percentage: {
      type: Number,
      required: true,
    },
    message: {
      type: String,
      required: false,
      default: null,
    },
  });
</script>

<template>
  <div class="fixed inset-0 z-100 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
    <div class="w-full max-w-xs space-y-4 px-6">
      <div class="text-center">
        <div class="mb-2 text-4xl font-bold text-primary">{{ percentage }}%</div>
        <p v-if="message" class="text-sm text-muted-foreground">{{ message }}</p>
      </div>
      <div class="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div class="h-full bg-primary transition-all duration-300 ease-out" :style="`width: ${percentage}%`" />
      </div>
    </div>
  </div>
</template>
