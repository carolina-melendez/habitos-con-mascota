<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink as NativeRouterLink, useRoute, type RouteLocationRaw } from 'vue-router'
const props = defineProps<{to:RouteLocationRaw}>()
const route = useRoute()
const target = computed(() => typeof props.to === 'string' && route.path.startsWith('/jardin/') && props.to.startsWith('/vista-previa/')
  ? props.to.replace('/vista-previa/','/jardin/') : props.to)
</script>
<template><NativeRouterLink :to="target"><slot /></NativeRouterLink></template>
