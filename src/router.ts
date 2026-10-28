import { createRouter, createWebHistory } from 'vue-router'
import { usePreviewStore } from './stores/preview'
import { useAccountStore } from './stores/account'
import AccountCallbackView from './views/AccountCallbackView.vue'
import WelcomeView from './views/WelcomeView.vue'
import AuthView from './views/AuthView.vue'
import PetSelectionView from './views/PetSelectionView.vue'
import PetNameView from './views/PetNameView.vue'
import HomeView from './views/HomeView.vue'
import TemplatesView from './views/TemplatesView.vue'
import ConfigureHabitView from './views/ConfigureHabitView.vue'
import RecordHabitView from './views/RecordHabitView.vue'
import HabitCompletedView from './views/HabitCompletedView.vue'
import GrowthView from './views/GrowthView.vue'
import ShopView from './views/ShopView.vue'
import AccessoryView from './views/AccessoryView.vue'
import InventoryView from './views/InventoryView.vue'
import HistoryView from './views/HistoryView.vue'
import HabitDetailView from './views/HabitDetailView.vue'
import EditHabitView from './views/EditHabitView.vue'
import HistoricalDayView from './views/HistoricalDayView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'welcome', component: WelcomeView },
    { path: '/acceso', name: 'login', component: AuthView, props: { mode: 'login' } },
    { path: '/registro', name: 'register', component: AuthView, props: { mode: 'register' } },
    { path: '/recuperar-acceso', name: 'recover', component: AuthView, props: { mode: 'recover' } },
    { path: '/cuenta/confirmar', name: 'confirm-account', component: AccountCallbackView, props: { recovery: false } },
    { path: '/cuenta/restablecer', name: 'reset-account', component: AccountCallbackView, props: { recovery: true } },
    { path: '/cuenta/error', name: 'account-error', component: AccountCallbackView, props: { recovery: false, loadError: true } },
    { path: '/vista-previa/mascotas', name: 'pets', component: PetSelectionView },
    { path: '/vista-previa/nombre', name: 'pet-name', component: PetNameView },
    { path: '/vista-previa/mi-dia', name: 'home', component: HomeView, meta: { needsPreview: true } },
    { path: '/vista-previa/mascota', name: 'growth', component: GrowthView, meta: { needsPreview: true } },
    { path: '/vista-previa/tienda', name: 'shop', component: ShopView, meta: { needsPreview: true } },
    { path: '/vista-previa/tienda/:itemId', name: 'accessory', component: AccessoryView, props: true, meta: { needsPreview: true } },
    { path: '/vista-previa/inventario', name: 'inventory', component: InventoryView, meta: { needsPreview: true } },
    { path: '/vista-previa/historial', name: 'history', component: HistoryView, meta: { needsPreview: true } },
    { path: '/vista-previa/historial/:habitId/:date', name: 'historical-day', component: HistoricalDayView, props: true, meta: { needsPreview: true } },
    { path: '/vista-previa/plantillas', name: 'templates', component: TemplatesView, meta: { needsPreview: true } },
    { path: '/vista-previa/plantillas/:templateId', name: 'configure-habit', component: ConfigureHabitView, props: true, meta: { needsPreview: true } },
    { path: '/vista-previa/habitos/:habitId', name: 'record-habit', component: RecordHabitView, props: true, meta: { needsPreview: true } },
    { path: '/vista-previa/habitos/:habitId/detalle', name: 'habit-detail', component: HabitDetailView, props: true, meta: { needsPreview: true } },
    { path: '/vista-previa/habitos/:habitId/editar', name: 'edit-habit', component: EditHabitView, props: true, meta: { needsPreview: true } },
    { path: '/vista-previa/habitos/:habitId/completado', name: 'habit-completed', component: HabitCompletedView, props: true, meta: { needsPreview: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

// Las mismas pantallas tienen rutas propias para cuentas; no comparten persistencia.
for (const route of router.getRoutes().filter(r=>r.path.startsWith('/vista-previa/'))) {
  router.addRoute({path:route.path.replace('/vista-previa/','/jardin/'),name:`account-${String(route.name)}`,
    components:route.components ?? {},props:route.props,meta:{account:true}})
}
router.beforeEach(async (to,from) => {
  const account = useAccountStore()
  if (from.path.startsWith('/jardin/') && to.path.startsWith('/vista-previa/')) return to.fullPath.replace('/vista-previa/','/jardin/')
  account.mode = Boolean(to.meta.account)
  if (to.meta.account) {
    try {
      await account.initialize()
      if (!account.session) return {name:'login'}
      await account.refresh()
      if (!account.garden?.pet && !['account-pets','account-pet-name'].includes(String(to.name))) return {name:'account-pets'}
      if (account.garden?.pet && ['account-pets','account-pet-name'].includes(String(to.name))) return {name:'account-home'}
    } catch { return {name:'account-error'} }
  }
  if (to.meta.needsPreview && !usePreviewStore().profile) return { name: 'pets' }
})
router.afterEach(to => {
  const titles: Record<string, string> = { welcome: 'Bienvenida', login: 'Iniciar sesión', register: 'Crear cuenta', recover: 'Recuperar acceso', pets: 'Elegir mascota', 'pet-name': 'Nombrar mascota', home: 'Mi día', templates: 'Plantillas', 'configure-habit': 'Configurar hábito', 'record-habit': 'Registrar hábito', 'habit-completed': 'Hábito completado' }
  Object.assign(titles, { growth: 'Mi mascota', shop: 'Tienda del bosque', accessory: 'Accesorio', inventory: 'Mi armario', history: 'Historial', 'historical-day': 'Registro histórico', 'habit-detail': 'Mi hábito', 'edit-habit': 'Editar hábito' })
  document.title = `Brotito · ${titles[String(to.name).replace(/^account-/,'')] ?? 'Tu pequeño hogar'}`
  requestAnimationFrame(() => document.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true }))
})
