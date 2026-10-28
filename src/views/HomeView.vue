<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '../components/AppButton.vue'
import PaginatedList from '../components/PaginatedList.vue'
import ConfirmationDialog from '../components/ConfirmationDialog.vue'
import HabitCard from '../components/HabitCard.vue'
import ViewHeader from '../components/ViewHeader.vue'
import PetScene from '../components/PetScene.vue'
import PreviewNav from '../components/PreviewNav.vue'
import { usePreviewStore } from '../stores/preview'
import { useHabitsStore } from '../stores/habits'
import { formatDay } from '../domain/habits'
import { useAccountStore } from '../stores/account'
const account = useAccountStore()
const store = usePreviewStore()
const habits = useHabitsStore()
const router = useRouter()
const resetOpen = ref(false)
const completed = computed(() => habits.todaysHabits.filter(h => habits.amount(h.id) >= h.target).length)
function reset() { habits.clear(); store.clear(); resetOpen.value = false; router.replace('/') }
</script>

<template>
  <div v-if="store.profile" class="view-stack">
    <ViewHeader :detail="`${habits.totals.coins} monedas`" />
    <h1 tabindex="-1">Tu día puede florecer.</h1>
    <p class="caption muted">{{ formatDay(habits.today, true) }}</p>
    <section class="home-pet">
      <div class="view-header"><p class="label">{{ store.profile.petName }} · Etapa {{ habits.stage.level }}</p><GardenLink to="/vista-previa/mascota" class="caption text-link">Ver crecimiento</GardenLink></div>
      <PetScene :pet-id="store.profile.petId" :stage="habits.stage.level" :accessories="Object.values(habits.state.commerce.equipped)" />
      <p class="label">Qué bonito verte por aquí.</p>
      <p class="caption muted">{{ habits.totals.xp }} de experiencia acumulada</p>
    </section>
    <div class="view-header"><h2 class="habit-section-title">Tus hábitos de hoy</h2><p class="caption muted">{{ completed }} de {{ habits.todaysHabits.length }} completos</p></div>
    <AppButton to="/vista-previa/plantillas">{{ habits.state.habits.length ? 'Añadir un hábito' : 'Elegir mi primer hábito' }}</AppButton>
    <PaginatedList :items="habits.todaysHabits" label="hábitos de hoy" :reset-key="habits.today" v-slot="{ items }"><HabitCard v-for="habit in items" :key="habit.id" :habit="habit" :amount="habits.amount(habit.id)" /></PaginatedList>
    <p v-if="!habits.todaysHabits.length" class="notice">{{ habits.state.habits.length ? 'Hoy no tienes hábitos programados. Tu jardín sigue aquí, a tu ritmo.' : 'Tu jardín de hábitos está por comenzar. Elige uno pequeño para hoy.' }}</p>
    <template v-if="habits.laterHabits.length"><h2 class="habit-section-title">Para otros días</h2><PaginatedList :items="habits.laterHabits" label="hábitos para otros días" :reset-key="habits.today" v-slot="{ items }"><GardenLink v-for="habit in items" :key="habit.id" class="habit-card" :to="`/vista-previa/habitos/${habit.id}`"><span class="label">{{ habit.name }}</span><span class="caption muted">{{ habit.startDate > habits.today ? `Comienza el ${formatDay(habit.startDate)}` : 'No está programado para hoy' }}</span></GardenLink></PaginatedList></template>
    <p v-if="habits.warning || store.storageWarning" class="notice" role="status">{{ habits.warning || store.storageWarning }}</p>
    <p class="caption muted">{{ account.mode ? 'Cada pequeño paso cuenta. Tu progreso confirmado se guarda en tu cuenta.' : 'Cada pequeño paso cuenta. Mascota, hábitos y registros se guardan solo en este navegador.' }}</p>
    <PreviewNav />
    <AppButton v-if="!account.mode" to="/vista-previa/mascotas" variant="secondary">Probar otra criatura</AppButton>
    <button v-if="!account.mode" class="text-link" type="button" @click="resetOpen = true">Borrar mi vista previa</button>
    <ConfirmationDialog :open="resetOpen" title="¿Empezar una nueva vista previa?" confirm-label="Borrar vista previa" @cancel="resetOpen = false" @confirm="reset"><p>Se borrarán de este navegador tu mascota, hábitos, registros y accesorios de la vista previa.</p></ConfirmationDialog>
  </div>
</template>

