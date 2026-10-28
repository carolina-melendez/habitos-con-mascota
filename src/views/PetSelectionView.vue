<script setup lang="ts">
import AppButton from '../components/AppButton.vue'
import PetPortrait from '../components/PetPortrait.vue'
import ViewHeader from '../components/ViewHeader.vue'
import { findPet, pets } from '../data/pets'
import { usePreviewStore } from '../stores/preview'
const store = usePreviewStore()
</script>

<template>
  <div class="view-stack">
    <ViewHeader back="/" detail="Paso 1 de 2" />
    <h1 tabindex="-1">¿Quién crecerá<br />contigo?</h1>
    <p class="muted">Cinco pequeñas criaturas, un nuevo hogar. Elige a tu compañera.</p>
    <div class="pet-grid" role="group" aria-label="Elige tu criatura">
      <button v-for="pet in pets" :key="pet.id" type="button" class="pet-option" :class="{ 'pet-option--selected': store.selection === pet.id }" :aria-pressed="store.selection === pet.id" :aria-label="`Elegir a ${pet.name}`" @click="store.select(pet.id)">
        <PetPortrait :pet-id="pet.id" variant="card" decorative />
        <span class="label">{{ pet.name }}<span v-if="store.selection === pet.id" aria-hidden="true"> &nbsp;✓</span></span>
        <span class="caption muted">{{ pet.description }}</span>
      </button>
    </div>
    <AppButton to="/vista-previa/nombre">Elegir a {{ findPet(store.selection).name }}</AppButton>
    <p class="caption muted">Cada criatura tendrá sus propias etapas de crecimiento.</p>
  </div>
</template>

