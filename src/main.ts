import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource/nunito/400.css'
import '@fontsource/nunito/700.css'
import '@fontsource/nunito/800.css'
import './styles.css'
import App from './App.vue'
import { router } from './router'
import GardenLink from './components/GardenLink.vue'

createApp(App).use(createPinia()).use(router).component('GardenLink',GardenLink).mount('#app')
