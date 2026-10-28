<script setup lang="ts">
import { findPet, type PetId } from '../data/pets'
withDefaults(defineProps<{ petId: PetId; variant?: 'hero' | 'card'; decorative?: boolean }>(), { variant: 'hero', decorative: false })
</script>

<template>
  <img class="pet-portrait" :src="`/illustrations/${petId}-${variant}.svg`" :alt="decorative ? '' : findPet(petId).name" :width="variant === 'card' ? 120 : 180" :height="variant === 'card' ? 120 : 180" />
</template>
