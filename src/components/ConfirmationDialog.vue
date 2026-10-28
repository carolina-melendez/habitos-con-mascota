<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import AppButton from './AppButton.vue'
const props = defineProps<{ open: boolean; title: string; confirmLabel?: string }>()
const emit = defineEmits<{ cancel: []; confirm: [] }>()
const dialog = ref<HTMLDialogElement>()
watch(() => props.open, async open => {
  await nextTick()
  if (open && !dialog.value?.open) dialog.value?.showModal()
  if (!open && dialog.value?.open) dialog.value?.close()
})
</script>
<template>
  <dialog ref="dialog" class="confirmation-dialog" aria-labelledby="confirmation-title" @cancel.prevent="emit('cancel')">
    <div class="view-stack">
      <h2 id="confirmation-title">{{ title }}</h2>
      <slot />
      <AppButton @click="emit('confirm')">{{ confirmLabel ?? 'Confirmar corrección' }}</AppButton>
      <AppButton variant="secondary" @click="emit('cancel')">Cancelar</AppButton>
    </div>
  </dialog>
</template>
