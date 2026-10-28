<script setup lang="ts">
import { computed, ref } from 'vue'
import AppButton from '../components/AppButton.vue'
import PaginatedList from '../components/PaginatedList.vue'
import AppField from '../components/AppField.vue'
import ViewHeader from '../components/ViewHeader.vue'
import { templates } from '../data/templates'
const query = ref('')
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const filtered = computed(() => templates.filter(t => normalize(t.name).includes(normalize(query.value))))
</script>
<template>
  <div class="view-stack">
    <ViewHeader back="/vista-previa/mi-dia" back-label="Mi día" detail="Brotito" />
    <h1 tabindex="-1">¿Qué quieres<br />hacer florecer?</h1>
    <p class="muted">Encuentra un pequeño hábito y hazlo tuyo.</p>
    <AppField id="template-search" v-model="query" label="Buscar una plantilla" placeholder="Buscar por nombre…" type="search" autocomplete="off" />
    <div class="view-header"><p class="label">Para empezar</p><span class="caption muted" role="status">{{ filtered.length }} plantillas</span></div>
    <PaginatedList :items="filtered" label="plantillas" :reset-key="query" v-slot="{ items }"><GardenLink v-for="template in items" :key="template.id" :to="`/vista-previa/plantillas/${template.id}`" class="template-card">
      <h2>{{ template.name }}</h2><p class="muted">{{ template.description }}</p><p class="caption brand-color">{{ template.unitLabel }} · Personalizar →</p>
    </GardenLink></PaginatedList>
    <p v-if="!filtered.length" class="notice">No encontramos esa plantilla. Puedes crear tu propio hábito.</p>
    <AppButton to="/vista-previa/plantillas/propio">Crear un hábito propio</AppButton>
  </div>
</template>
