<script setup lang="ts">
import { computed, ref } from 'vue'
import AppButton from '../components/AppButton.vue'
import PetScene from '../components/PetScene.vue'
import PreviewNav from '../components/PreviewNav.vue'
import ViewHeader from '../components/ViewHeader.vue'
import { nextStage, stages } from '../domain/commerce'
import { useHabitsStore } from '../stores/habits'
import { usePreviewStore } from '../stores/preview'
const store = useHabitsStore()
const preview = usePreviewStore()
const viewing = ref<number | null>(null)
const actualPet = computed(() => preview.profile!.petId)
const next = computed(() => nextStage(store.totals.xp))
const displayed = computed(() => stages.find(s => s.level === viewing.value) ?? store.stage)
const reference = computed(() => viewing.value !== null && actualPet.value !== 'flori' && displayed.value.level > 2)
const equipment = computed(() => Object.values(store.state.commerce.equipped))
</script>
<template>
  <div v-if="preview.profile" class="view-stack">
    <ViewHeader back="/vista-previa/mi-dia" back-label="Mi día" detail="Mi mascota" />
    <h1 tabindex="-1">Cada hábito<br />la ayuda a florecer.</h1>
    <section class="growth-hero">
      <span v-if="viewing !== null" class="preview-badge">Vista previa · {{ store.totals.xp >= displayed.xp ? 'Etapa alcanzada' : `Desde ${displayed.xp} XP` }}</span>
      <PetScene :pet-id="reference ? 'flori' : actualPet" :stage="displayed.level" :accessories="viewing === null ? equipment : []" />
      <h2>{{ reference ? 'Flori · Referencia' : preview.profile.petName }}</h2>
      <p class="caption muted">Etapa {{ displayed.level }} · {{ displayed.name }}</p>
      <button v-if="viewing !== null" type="button" class="text-link" @click="viewing = null">Volver a mi etapa actual</button>
    </section>
    <div class="view-header"><p class="label">{{ store.totals.xp }}{{ next ? ` / ${next.xp}` : '' }} de experiencia</p><p class="caption muted">{{ next ? `Faltan ${next.xp - store.totals.xp}` : 'Última etapa' }}</p></div>
    <progress class="habit-progress growth-progress" :value="next ? store.totals.xp - store.stage.xp : 1" :max="next ? next.xp - store.stage.xp : 1" aria-label="Progreso hacia la siguiente etapa" />
    <h2>Tu camino de crecimiento</h2>
    <p v-if="actualPet !== 'flori'" class="caption muted">Flori muestra las cuatro etapas de referencia. {{ preview.profile.petName }} conserva sus dos primeras formas; su experiencia continúa acumulándose.</p>
    <div class="stage-grid"><button v-for="stage in stages" :key="stage.level" type="button" class="stage-card" :class="{ 'stage-card--future': store.totals.xp < stage.xp }" :aria-pressed="viewing === stage.level" :aria-label="`Ver etapa ${stage.level}: ${stage.name}`" @click="viewing = stage.level"><PetScene pet-id="flori" :stage="stage.level" :size="110" /><span class="label">{{ stage.name }}</span><span class="caption">{{ store.stage.level === stage.level ? 'Actual' : `Desde ${stage.xp} XP` }}{{ actualPet !== 'flori' ? ' · Flori' : '' }}</span></button></div>
    <AppButton v-if="next" @click="viewing = next.level">Ver su próxima etapa</AppButton>
    <p class="caption muted">Un día pendiente no le quita lo que ya ha crecido. Las correcciones sí recalculan la experiencia y la etapa.</p>
    <AppButton to="/vista-previa/inventario">Ver accesorios de {{ preview.profile.petName }}</AppButton>
    <p v-if="store.warning" class="notice" role="status">{{ store.warning }}</p>
    <PreviewNav />
  </div>
</template>
