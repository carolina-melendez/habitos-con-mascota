<script setup lang="ts" generic="T">
import { computed, ref, watch } from 'vue'
const props = withDefaults(defineProps<{ items: T[]; label: string; resetKey?: string; pageSize?: number }>(), { pageSize: 5 })
const page = ref(1)
const pages = computed(() => Math.max(1, Math.ceil(props.items.length / props.pageSize)))
const visible = computed(() => props.items.slice((page.value - 1) * props.pageSize, page.value * props.pageSize))
watch(pages, total => { page.value = Math.min(page.value, total) }, { flush: 'sync' })
watch(() => props.resetKey, () => { page.value = 1 }, { flush: 'sync' })
</script>

<template>
  <div class="paginated-list">
    <slot :items="visible" />
    <nav v-if="pages > 1" class="list-pagination" :aria-label="`Paginación de ${label}`">
      <p class="caption muted pagination-summary" role="status">{{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, items.length) }} de {{ items.length }}</p>
      <button type="button" class="pagination-button" :disabled="page === 1" :aria-label="`Página anterior de ${label}`" @click="page--">← Anterior</button>
      <span class="caption">{{ page }} / {{ pages }}</span>
      <button type="button" class="pagination-button" :disabled="page === pages" :aria-label="`Página siguiente de ${label}`" @click="page++">Siguiente →</button>
    </nav>
  </div>
</template>
