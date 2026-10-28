<script setup lang="ts">
import AppButton from '../components/AppButton.vue'
</script>

<template>
  <div class="view-stack">
    <p class="wordmark wordmark--mobile">Brotito</p>
    <h1 tabindex="-1">Un pequeño hogar<br />para tus hábitos.</h1>
    <div class="welcome-garden">
      <img class="garden-background" src="/illustrations/garden.svg" alt="" width="342" height="280" />
      <img class="garden-brotito" src="/illustrations/brotito-welcome.svg" alt="Brotito en su jardín al atardecer" width="175" height="175" />
    </div>
    <h2>Cuida de ti, un brote a la vez.</h2>
    <p class="muted">Elige tus hábitos y encuentra una criatura del bosque que crezca contigo.</p>
    <AppButton to="/registro">Encontrar a mi compañero</AppButton>
    <p class="caption muted">Flores, calma y pequeños pasos cada día.</p>
    <AppButton to="/acceso" variant="secondary">Ya tengo una cuenta</AppButton>
  </div>
</template>

