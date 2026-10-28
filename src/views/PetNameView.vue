<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '../components/AppButton.vue'
import AppField from '../components/AppField.vue'
import PetPortrait from '../components/PetPortrait.vue'
import { findPet } from '../data/pets'
import { usePreviewStore } from '../stores/preview'
const store = usePreviewStore()
const router = useRouter()
const name = ref(store.profile?.petId === store.selection ? store.profile.petName : findPet(store.selection).name as string)
const error = ref('')
const busy = ref(false)
watch(() => store.selection, () => { name.value = findPet(store.selection).name; error.value = '' })
async function submit() {
  if (busy.value) return
  busy.value = true
  try { await store.save(name.value); error.value = ''; await router.push('/vista-previa/mi-dia') }
  catch (e) { error.value = e instanceof Error ? e.message : 'No pudimos guardar el nombre.' }
  finally { busy.value = false }
}
</script>

<template>
  <form class="view-stack" @submit.prevent="submit">
    <p class="label brand-color">Brotito</p>
    <h1 tabindex="-1">Un nombre para<br />tu nueva compañía.</h1>
    <p class="caption muted">Paso 2 de 2 · Elegiste a {{ findPet(store.selection).name }}</p>
    <div class="pet-hero"><PetPortrait :pet-id="store.selection" /></div>
    <AppField id="pet-name" v-model="name" label="Nombre de tu mascota" autocomplete="off" :error="error" />
    <p class="caption muted">Puedes elegir un nombre de 1 a 30 caracteres.</p>
    <AppButton type="submit" :disabled="busy">Abrir nuestro pequeño hogar</AppButton>
    <AppButton to="/vista-previa/mascotas" variant="secondary">Elegir otra criatura</AppButton>
  </form>
</template>

