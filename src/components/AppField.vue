<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue'
defineOptions({ inheritAttrs: false })
const attrs = useAttrs()
const props = withDefaults(defineProps<{ id: string; label: string; modelValue: string; type?: string; placeholder?: string; autocomplete?: string; error?: string; hint?: string; maxlength?: number }>(), { type: 'text' })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const showPassword = ref(false)
const inputType = computed(() => props.type === 'password' && showPassword.value ? 'text' : props.type)
const describedBy = computed(() => [props.hint ? `${props.id}-hint` : '', props.error ? `${props.id}-error` : ''].filter(Boolean).join(' ') || undefined)
</script>

<template>
  <div class="app-field">
    <label :for="id">{{ label }}</label>
    <div class="field-control" :class="{ 'field-control--error': error }">
      <input v-bind="attrs" :id="id" :type="inputType" :value="modelValue" :placeholder="placeholder" :autocomplete="autocomplete" :maxlength="maxlength" :aria-invalid="Boolean(error)" :aria-describedby="describedBy" @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
      <button v-if="type === 'password'" class="password-toggle" type="button" :aria-label="`${showPassword ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`" :aria-pressed="showPassword" @click="showPassword = !showPassword">{{ showPassword ? 'Ocultar' : 'Mostrar' }}</button>
    </div>
    <p v-if="hint" :id="`${id}-hint`" class="caption muted">{{ hint }}</p>
    <p v-if="error" :id="`${id}-error`" class="field-error" role="alert">{{ error }}</p>
  </div>
</template>
