<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '../components/AppButton.vue'
import PetScene from '../components/PetScene.vue'
import ViewHeader from '../components/ViewHeader.vue'
import { formatDay } from '../domain/habits'
import { useHabitsStore } from '../stores/habits'
import { usePreviewStore } from '../stores/preview'
const props = defineProps<{ habitId: string }>()
const store = useHabitsStore()
const preview = usePreviewStore()
const habit = computed(() => store.habitForDate(props.habitId))
const complete = computed(() => Boolean(habit.value && store.amount(props.habitId) >= habit.value.target))
</script>
<template>
  <div v-if="habit && complete && preview.profile" class="view-stack">
    <ViewHeader :detail="`Hoy, ${formatDay(store.today)}`" />
    <h1 tabindex="-1">¡Un nuevo<br />brote para hoy!</h1>
    <p class="muted">{{ habit.templateId === 'agua' ? 'Completaste tu meta de agua.' : `Completaste ${habit.name}.` }}</p>
    <div class="celebration-card"><p class="label brand-color">✦ Una pequeña victoria ✦</p><PetScene :pet-id="preview.profile.petId" :stage="store.stage.level" :accessories="Object.values(store.state.commerce.equipped)" /><p class="big-number">{{ habit.kind === 'binary' ? 'Completado ✓' : `${store.amount(habit.id)} de ${habit.target} ${habit.unit}` }}</p><p>Qué bonito cuidarte.</p></div>
    <div class="reward-grid" aria-label="Recompensa incluida en tu saldo"><div><p class="big-number">+10</p><p class="label">Experiencia</p></div><div><p class="big-number">+5</p><p class="label">Monedas</p></div></div>
    <p class="muted">{{ preview.profile.petName }} está un poquito más cerca de crecer.</p>
    <GardenLink to="/vista-previa/mascota" class="text-link">Ver su crecimiento · Etapa {{ store.stage.level }}</GardenLink>
    <AppButton to="/vista-previa/mi-dia">Volver a mi día</AppButton>
    <GardenLink :to="`/vista-previa/habitos/${habit.id}`" class="text-link">Puedes corregir el registro desde tu hábito.</GardenLink>
    <p class="caption muted">Esta recompensa ya está incluida en tu saldo; volver a esta pantalla no vuelve a sumarla.</p>
    <p v-if="store.warning" class="notice" role="status">{{ store.warning }}</p>
  </div>
  <div v-else class="view-stack"><h1 tabindex="-1">Cada paso cuenta.</h1><p>Este hábito todavía no está completado hoy.</p><AppButton to="/vista-previa/mi-dia">Volver a mi día</AppButton></div>
</template>
