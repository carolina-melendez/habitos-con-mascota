export {}
declare module 'vue' {
  export interface GlobalComponents {
    GardenLink: typeof import('./components/GardenLink.vue')['default']
  }
}
