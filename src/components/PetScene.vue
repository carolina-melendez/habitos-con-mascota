<script setup lang="ts">
import { computed } from 'vue'
import { findPet, type PetId } from '../data/pets'
import { findAccessory, type AccessoryId } from '../domain/commerce'
const props = withDefaults(defineProps<{ petId: PetId; stage?: number; accessories?: AccessoryId[]; size?: 100 | 110 | 130 | 150 | 180 | 200 | 230 }>(), { stage: 1, accessories: () => [], size: 180 })
const level = computed(() => props.petId === 'flori' ? Math.min(4, Math.max(1, props.stage)) : Math.min(2, Math.max(1, props.stage)))
const nativeSize = computed(() => {
  if (props.petId !== 'flori') return 180
  if (level.value > 1) return props.size === 110 && !props.accessories.length ? 110 : 180
  if (props.accessories.some(id => id !== 'corona') && ![130, 180].includes(props.size)) return 180
  if (props.accessories.length && [110, 150].includes(props.size)) return 180
  return props.size
})
const base = computed(() => nativeSize.value === 180 ? `${props.petId}-hero` : `flori-base-${nativeSize.value}`)
const label = computed(() => `${findPet(props.petId).name}, etapa ${level.value}${props.accessories.length ? `, con ${props.accessories.map(id => findAccessory(id)?.name).join(', ')}` : ''}`)
</script>
<template>
  <div :key="`${petId}-${level}`" class="pet-scene" :class="{ 'pet-scene--grown': level > 1 }" :style="{ width: `${nativeSize}px`, height: `${nativeSize}px` }" role="img" :aria-label="label">
    <img v-if="petId === 'flori' && level === 4" class="pet-layer" :src="`/illustrations/flori-canopy-${nativeSize}.svg`" alt="" />
    <img class="pet-layer" :src="`/illustrations/${base}.svg`" alt="" />
    <img v-if="level >= 2" class="pet-layer" :src="`/illustrations/${petId}-growth-${nativeSize}.svg`" alt="" />
    <img v-if="petId === 'flori' && level === 3" class="pet-layer" :src="`/illustrations/flori-bloom-${nativeSize}.svg`" alt="" />
    <template v-if="petId === 'flori' && level === 4"><img class="pet-layer pet-garden-back" :src="`/illustrations/flori-garden-back-${nativeSize}.svg`" alt="" /><img class="pet-layer pet-garden-front" :src="`/illustrations/flori-garden-front-${nativeSize}.svg`" alt="" /></template>
    <img v-for="id in accessories" :key="id" class="pet-layer" :class="{ 'pet-glasses': id === 'gafas' }" :src="`/illustrations/${id}-${nativeSize}.svg`" alt="" />
  </div>
</template>
