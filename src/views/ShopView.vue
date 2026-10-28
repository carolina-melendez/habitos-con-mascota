<script setup lang="ts">
import PetScene from '../components/PetScene.vue'
import PreviewNav from '../components/PreviewNav.vue'
import ViewHeader from '../components/ViewHeader.vue'
import { accessories } from '../domain/commerce'
import { useHabitsStore } from '../stores/habits'
import { usePreviewStore } from '../stores/preview'
const store = useHabitsStore()
const preview = usePreviewStore()
</script>
<template>
  <div v-if="preview.profile" class="view-stack">
    <ViewHeader back="/vista-previa/mi-dia" back-label="Mi día" :detail="`${store.totals.coins} monedas`" />
    <h1 tabindex="-1">Pequeños detalles,<br />mucha personalidad.</h1>
    <p class="muted">Accesorios para acompañar a {{ preview.profile.petName }}.</p>
    <GardenLink v-for="(item, index) in accessories" :key="item.id" :to="`/vista-previa/tienda/${item.id}`" class="accessory-card" :class="{ 'accessory-card--pink': index === 0 }">
      <PetScene :pet-id="preview.profile.petId" :stage="store.stage.level" :accessories="[item.id]" :size="130" />
      <div class="view-header"><p class="label">{{ item.name }}</p><p class="caption muted">{{ item.category }}</p></div>
      <div class="view-header"><p class="label">{{ store.owns(item.id) ? 'Adquirido ✓' : `${item.price} monedas` }}</p><p class="caption muted">Ver accesorio →</p></div>
    </GardenLink>
    <p class="caption muted">Tus accesorios se conservan cuando tu mascota crece. Sin pagos reales ni requisitos de nivel.</p>
    <p v-if="store.warning" class="notice" role="status">{{ store.warning }}</p>
    <PreviewNav />
  </div>
</template>
