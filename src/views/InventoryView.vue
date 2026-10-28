<script setup lang="ts">
import { computed, ref } from 'vue'
import AppButton from '../components/AppButton.vue'
import PaginatedList from '../components/PaginatedList.vue'
import PetScene from '../components/PetScene.vue'
import PreviewNav from '../components/PreviewNav.vue'
import ViewHeader from '../components/ViewHeader.vue'
import { accessories, type AccessoryId } from '../domain/commerce'
import { useHabitsStore } from '../stores/habits'
import { usePreviewStore } from '../stores/preview'
const store = useHabitsStore()
const preview = usePreviewStore()
const items = computed(() => accessories.filter(item => store.owns(item.id)))
const equipment = computed(() => Object.values(store.state.commerce.equipped))
const equipmentLabel = computed(() => equipment.value.map(id => accessories.find(a => a.id === id)?.name).join(' · '))
const error = ref('')
const message = ref('')
async function toggle(id: AccessoryId) {
  const removing = equipment.value.includes(id)
  try { if (removing) await store.unequipItem(id); else await store.equipItem(id); error.value = ''; message.value = removing ? 'Accesorio guardado en tu armario.' : 'Tu mascota ya lleva su accesorio.' }
  catch (e) { error.value = e instanceof Error ? e.message : 'No pudimos cambiar el accesorio.' }
}
</script>
<template>
  <div v-if="preview.profile" class="view-stack">
    <ViewHeader back="/vista-previa/mascota" back-label="Mi mascota" :detail="`${store.totals.coins} monedas`" />
    <h1 tabindex="-1">Un armario<br />con encanto.</h1>
    <p class="muted">Elige qué llevará {{ preview.profile.petName }} hoy.</p>
    <div class="growth-hero"><PetScene :pet-id="preview.profile.petId" :stage="store.stage.level" :accessories="equipment" :size="equipment.length ? 200 : 150" /><p class="caption muted">{{ equipment.length ? equipmentLabel : 'Sin accesorios equipados' }}</p></div>
    <div class="view-header"><h2 class="habit-section-title">Mis accesorios</h2><p class="caption muted">{{ items.length }} {{ items.length === 1 ? 'adquirido' : 'adquiridos' }}</p></div>
    <p v-if="!items.length" class="notice">Tu armario está por florecer. Completa hábitos para reunir monedas y elegir tu primer accesorio.</p>
    <p v-if="error" class="field-error" role="alert">{{ error }}</p><p v-if="message" class="caption brand-color" role="status">{{ message }}</p>
    <PaginatedList :items="items" label="accesorios del armario" v-slot="{ items: visibleItems }"><article v-for="item in visibleItems" :key="item.id" class="accessory-card">
      <PetScene :pet-id="preview.profile.petId" :stage="store.stage.level" :accessories="[item.id]" :size="100" />
      <div class="view-header"><h2 class="habit-section-title">{{ item.name }}</h2><p class="caption muted">{{ item.category }}</p></div>
      <AppButton :variant="equipment.includes(item.id) ? 'secondary' : 'primary'" @click="toggle(item.id)">{{ equipment.includes(item.id) ? `Quitar ${item.name.toLowerCase()}` : `Equipar ${item.name.toLowerCase()}` }}</AppButton>
    </article></PaginatedList>
    <AppButton to="/vista-previa/tienda">Visitar la tienda</AppButton>
    <p class="caption muted">Puedes llevar un accesorio por categoría. Quitar uno lo conserva en tu armario; una compra revertida por una corrección vuelve a la tienda.</p>
    <p v-if="store.warning" class="notice" role="status">{{ store.warning }}</p><PreviewNav />
  </div>
</template>
