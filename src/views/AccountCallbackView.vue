<script setup lang="ts">
import { onMounted,ref } from 'vue'
import { useRoute,useRouter } from 'vue-router'
import AppButton from '../components/AppButton.vue'
import AppField from '../components/AppField.vue'
import { useAccountStore } from '../stores/account'
const props = defineProps<{recovery:boolean;loadError?:boolean}>()
const account = useAccountStore(); const route = useRoute(); const router = useRouter()
const busy = ref(true); const valid = ref(false); const error = ref(''); const saved = ref(false)
const password = ref(''); const confirmation = ref('')
const signOutPending = ref(false)
onMounted(async()=>{
  try {
    if (props.loadError) { error.value = account.warning || 'No pudimos cargar tu jardín. Puedes volver a intentar.'; return }
    if (route.query.error) throw new Error('Este enlace ya no es válido. Solicita uno nuevo.')
    if (props.recovery && account.recovery && !route.query.code) valid.value = true
    else {
      await account.callback(typeof route.query.code === 'string' ? route.query.code : '',props.recovery)
      // El código de un solo uso no debe quedarse en la dirección ni en el historial actual.
      await router.replace({path:route.path,query:{}})
      valid.value = true
    }
    if (!props.recovery) await router.replace('/jardin/mi-dia')
  } catch(e) { error.value = e instanceof Error ? e.message : 'No pudimos verificar el enlace.' }
  finally { busy.value = false }
})
async function save() {
  if (busy.value) return
  if (password.value.length < 8) { error.value = 'Usa al menos 8 caracteres.'; return }
  if (password.value !== confirmation.value) { error.value = 'Las contraseñas no coinciden.'; return }
  busy.value = true; error.value = ''
  try { signOutPending.value = !(await account.resetPassword(password.value)); password.value = ''; confirmation.value = ''; valid.value = false; saved.value = true }
  catch(e) { error.value = e instanceof Error ? e.message : 'No pudimos cambiar la contraseña.' }
  finally { busy.value = false }
}
async function finishLogout() {
  if (busy.value) return
  busy.value = true; error.value = ''
  try { await account.logout(); signOutPending.value = false }
  catch { error.value = 'Tu contraseña ya está actualizada. Comprueba tu conexión y vuelve a cerrar sesión.' }
  finally { busy.value = false }
}
async function retry() {
  busy.value = true; error.value = ''
  try { await account.refresh(); await router.replace('/jardin/mi-dia') }
  catch { error.value = account.warning || 'No pudimos cargar tu jardín.' }
  finally { busy.value = false }
}
</script>
<template>
  <div class="view-stack">
    <p class="label brand-color">Brotito</p>
    <h1 tabindex="-1">{{ loadError ? 'Tu jardín sigue aquí.' : recovery ? 'Una nueva llave para tu hogar.' : 'Confirmemos tu pequeño hogar.' }}</h1>
    <p v-if="busy" role="status">Un momento, estamos comprobando tu cuenta…</p>
    <p v-if="error" class="field-error" role="alert">{{ error }}</p>
    <p v-if="saved" class="notice" role="status">{{ signOutPending ? 'Tu contraseña ya se actualizó. Falta cerrar la sesión porque no pudimos conectar. No necesitas cambiarla otra vez.' : 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.' }}</p>
    <AppButton v-if="signOutPending" :disabled="busy" @click="finishLogout">Cerrar sesión para continuar</AppButton>
    <form v-if="recovery && valid" class="view-stack" @submit.prevent="save">
      <AppField id="new-password" v-model="password" type="password" label="Nueva contraseña" autocomplete="new-password" hint="Usa al menos 8 caracteres." />
      <AppField id="repeat-password" v-model="confirmation" type="password" label="Confirmar contraseña" autocomplete="new-password" />
      <AppButton type="submit" :disabled="busy">Guardar nueva contraseña</AppButton>
    </form>
    <AppButton v-if="loadError && account.session" :disabled="busy" @click="retry">Volver a intentar</AppButton>
    <AppButton v-if="!busy && !signOutPending" to="/acceso" variant="secondary">Volver a iniciar sesión</AppButton>
    <AppButton v-if="recovery && !valid && !busy && !saved" to="/recuperar-acceso" variant="secondary">Solicitar otro enlace</AppButton>
  </div>
</template>
