<script setup lang="ts">
defineProps<{ message: string }>()
</script>

<template>
  <section class="brand-card">
    <div class="brand-slot"><img src="/illustrations/brotito-access.svg" alt="Brotito, un pequeño brote de árbol" width="126" height="126" /></div>
    <p class="label">{{ message }}</p>
  </section>
</template>
