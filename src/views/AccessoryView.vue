<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppButton from '../components/AppButton.vue'
import PetScene from '../components/PetScene.vue'
import PreviewNav from '../components/PreviewNav.vue'
import ViewHeader from '../components/ViewHeader.vue'
import { findAccessory } from '../domain/commerce'
import { useHabitsStore } from '../stores/habits'
import { usePreviewStore } from '../stores/preview'
const props = defineProps<{ itemId: string }>()
const store = useHabitsStore()
const preview = usePreviewStore()
const item = computed(() => findAccessory(props.itemId))
const reviewedBalance = ref(store.totals.coins)
const error = ref('')
const bought = ref(false)
const busy = ref(false)
watch(() => props.itemId, () => { reviewedBalance.value = store.totals.coins; error.value = ''; bought.value = false })
async function purchase() {
  if (!item.value || busy.value) return
  busy.value = true
  try { await store.purchase(item.value.id, reviewedBalance.value); bought.value = true; error.value = '' }
  catch (e) { error.value = e instanceof Error ? e.message : 'No pudimos guardar la compra.'; reviewedBalance.value = store.totals.coins }
  finally { busy.value = false }
}
</script>
<template>
  <div v-if="item && preview.profile" class="view-stack">
    <ViewHeader back="/vista-previa/tienda" back-label="Tienda" :detail="`${store.totals.coins} monedas`" />
    <h1 class="multiline" tabindex="-1">{{ bought ? 'Un detalle nuevo\npara su pequeño hogar.' : item.title }}</h1>
    <div class="growth-hero"><PetScene :pet-id="preview.profile.petId" :stage="store.stage.level" :accessories="[item.id]" :size="item.id === 'corona' ? 230 : 180" /><p class="caption muted">Vista previa en {{ preview.profile.petName }}</p></div>
    <h2>{{ item.name }}</h2><p class="muted">{{ item.description }}</p>
    <div class="view-header"><p class="label">Categoría</p><p class="caption muted">{{ item.category }}</p></div>
    <div class="view-header"><p class="label">Precio</p><p class="caption muted">{{ item.price }} monedas</p></div>
    <div v-if="!store.owns(item.id)" class="view-header"><p class="label">{{ store.totals.coins >= item.price ? 'Saldo después de comprar' : 'Te faltan' }}</p><p class="caption muted">{{ Math.abs(store.totals.coins - item.price) }} monedas</p></div>
    <p v-if="error" class="field-error" role="alert">{{ error }}</p>
    <p v-if="bought && store.owns(item.id)" class="notice" role="status">Ya está en tu inventario. Puedes equiparlo cuando quieras.</p>
    <AppButton v-if="store.owns(item.id)" to="/vista-previa/inventario">Ver en mi armario</AppButton>
    <AppButton v-else :disabled="busy || store.totals.coins < item.price" @click="purchase">{{ store.totals.coins < item.price ? 'Necesitas más monedas' : `Comprar por ${item.price} monedas` }}</AppButton>
    <p class="caption muted">Podrás equiparlo o quitarlo desde tu inventario. Comprar no cambia la experiencia de tu mascota.</p>
    <p v-if="store.warning" class="notice" role="status">{{ store.warning }}</p><PreviewNav />
  </div>
  <div v-else class="view-stack"><h1 tabindex="-1">Ese accesorio no está en la tienda.</h1><AppButton to="/vista-previa/tienda">Volver a la tienda</AppButton></div>
</template>
