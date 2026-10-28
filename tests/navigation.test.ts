import {beforeEach,describe,expect,it,vi} from 'vitest'
import {createPinia,setActivePinia} from 'pinia'
import {mount} from '@vue/test-utils'
const account=vi.hoisted(()=>({mode:false,session:null as null|{user:{id:string}},garden:{pet:null as null|{petId:string;petName:string}},initialize:vi.fn(),refresh:vi.fn()}))
vi.mock('../src/stores/account',()=>({useAccountStore:()=>account}))
import {router} from '../src/router'
import GardenLink from '../src/components/GardenLink.vue'
import {PREVIEW_KEY} from '../src/domain/preview'
beforeEach(async()=>{
  vi.spyOn(window,'scrollTo').mockImplementation(()=>{})
  setActivePinia(createPinia());localStorage.clear();account.session=null;account.mode=false;account.garden.pet=null
  account.initialize.mockResolvedValue(undefined);account.refresh.mockResolvedValue(undefined)
  await router.push('/')
})
describe('rutas de cuenta y vista previa',()=>{
  it('exige sesión aunque exista una mascota local',async()=>{
    localStorage.setItem(PREVIEW_KEY,JSON.stringify({petId:'seti',petName:'Local'}))
    await router.push('/jardin/mi-dia');expect(router.currentRoute.value.path).toBe('/acceso')
  })
  it('una cuenta sin mascota empieza por adoptar, sin tomar la mascota local',async()=>{
    localStorage.setItem(PREVIEW_KEY,JSON.stringify({petId:'seti',petName:'Local'}))
    account.session={user:{id:'first'}};await router.push('/jardin/mi-dia')
    expect(router.currentRoute.value.path).toBe('/jardin/mascotas')
  })
  it('los enlaces y la navegación después de guardar conservan el espacio de cuenta',async()=>{
    account.session={user:{id:'first'}};account.garden.pet={petId:'flori',petName:'Flor'}
    await router.push('/jardin/mi-dia')
    const link=mount(GardenLink,{props:{to:'/vista-previa/tienda'},slots:{default:'Tienda'},global:{plugins:[router]}})
    expect(link.find('a').attributes('href')).toBe('/jardin/tienda')
    await router.push('/vista-previa/habitos/test-id/detalle')
    expect(router.currentRoute.value.path).toBe('/jardin/habitos/test-id/detalle')
    expect(router.currentRoute.value.params.habitId).toBe('test-id')
    link.unmount()
  })
  it('volver al inicio permite explorar la vista local sin cerrar la cuenta',async()=>{
    account.session={user:{id:'first'}};account.garden.pet={petId:'flori',petName:'Flor'}
    await router.push('/jardin/mi-dia');await router.push('/');await router.push('/vista-previa/mascotas')
    expect(router.currentRoute.value.path).toBe('/vista-previa/mascotas');expect(account.mode).toBe(false)
  })
})
