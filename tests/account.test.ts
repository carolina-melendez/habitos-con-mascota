import {beforeEach,describe,expect,it,vi} from 'vitest'
import {createPinia,setActivePinia} from 'pinia'
import type {Session} from '@supabase/supabase-js'
import {emptyHabitState,HABITS_KEY} from '../src/domain/habits'
import {PREVIEW_KEY} from '../src/domain/preview'
import type {GardenSnapshot} from '../src/domain/account'

const mock = vi.hoisted(()=>({rpc:vi.fn(),getSession:vi.fn(),onAuthStateChange:vi.fn(),signOut:vi.fn(),headers:vi.fn(),profile:vi.fn(),exchange:vi.fn(),updateUser:vi.fn(),signUp:vi.fn()}))
vi.mock('../src/lib/supabase',()=>({getSupabase:()=>({
  auth:{getSession:mock.getSession,onAuthStateChange:mock.onAuthStateChange,signOut:mock.signOut,exchangeCodeForSession:mock.exchange,updateUser:mock.updateUser,signUp:mock.signUp},
  rpc:(name:string,args:unknown)=>{
    const response=mock.rpc(name,args)
    return {setHeader:(...header:unknown[])=>{mock.headers(...header);return response}}
  },
  from:()=>({select:()=>({eq:()=>({maybeSingle:()=>({setHeader:()=>mock.profile()})})})}),
})}))
import {useAccountStore} from '../src/stores/account'
import {useHabitsStore} from '../src/stores/habits'
import {usePreviewStore} from '../src/stores/preview'

const first='11111111-1111-1111-1111-111111111111'
const second='22222222-2222-2222-2222-222222222222'
function session(id=first):Session{return {access_token:`test-${id}`,refresh_token:'test',expires_in:3600,token_type:'bearer',user:{id,user_metadata:{name:'Prueba'},app_metadata:{},aud:'authenticated',created_at:'2026-10-20T00:00:00Z'}}}
function snapshot(id=first):GardenSnapshot{
  return {userId:id,displayName:'Prueba',revision:4,today:'2026-10-20',pet:{petId:'flori',petName:'Flor'},
    totals:{xp:0,monedas_ganadas:0,saldo:0,etapa:1},state:emptyHabitState('UTC')}
}
let event:(event:string,next:Session|null)=>void
beforeEach(()=>{
  vi.resetAllMocks();localStorage.clear();setActivePinia(createPinia())
  mock.getSession.mockResolvedValue({data:{session:session()},error:null})
  mock.onAuthStateChange.mockImplementation(callback=>{event=callback;return {data:{subscription:{unsubscribe:vi.fn()}}}})
  mock.profile.mockResolvedValue({data:{id:first},error:null})
  mock.rpc.mockImplementation(async(name)=>({data:name==='brotito_jardin'?snapshot():null,error:null}))
  mock.signOut.mockResolvedValue({error:null})
  mock.exchange.mockResolvedValue({data:{session:session()},error:null})
  mock.updateUser.mockResolvedValue({error:null})
})
describe('confirmación y recuperación',()=>{
  it('registrarse sin sesión de confirmación no crea un jardín ni simula autenticación',async()=>{
    mock.getSession.mockResolvedValue({data:{session:null},error:null})
    mock.signUp.mockResolvedValue({data:{session:null},error:null})
    const account=useAccountStore();expect(await account.register('Prueba','demo@example.com','test-only-123')).toBe(false)
    expect(account.session).toBeNull();expect(mock.rpc).not.toHaveBeenCalled()
    expect(mock.signUp).toHaveBeenCalledWith(expect.objectContaining({options:expect.objectContaining({emailRedirectTo:expect.stringContaining('/cuenta/confirmar')})}))
  })
  it('un enlace de confirmación normal no habilita cambiar la contraseña',async()=>{
    const account=useAccountStore();await expect(account.callback('normal-code',true)).rejects.toThrow('no permite cambiar')
    await expect(account.resetPassword('test-only-123')).rejects.toThrow('nuevo enlace')
    expect(mock.updateUser).not.toHaveBeenCalled()
  })
  it('requiere evento de recuperación, cambia contraseña y termina la sesión',async()=>{
    mock.exchange.mockImplementation(async()=>{event('PASSWORD_RECOVERY',session());return {data:{session:session()},error:null}})
    const account=useAccountStore();await account.callback('recovery-code',true)
    expect(account.recovery).toBe(true);await account.resetPassword('test-only-123')
    expect(mock.updateUser).toHaveBeenCalledWith({password:'test-only-123'})
    expect(mock.signOut).toHaveBeenCalledWith({scope:'local'});expect(account.session).toBeNull();expect(account.recovery).toBe(false)
  })
  it('un fallo al cerrar sesión no presenta la contraseña confirmada como fallida',async()=>{
    mock.exchange.mockImplementation(async()=>{event('PASSWORD_RECOVERY',session());return {data:{session:session()},error:null}})
    mock.signOut.mockResolvedValue({error:{message:'Failed to fetch'}})
    const account=useAccountStore();await account.callback('recovery-code',true)
    expect(await account.resetPassword('test-only-123')).toBe(false)
    expect(mock.updateUser).toHaveBeenCalledTimes(1);expect(account.recovery).toBe(false)
    expect(account.session).not.toBeNull()
  })
})
describe('sesión y aislamiento de datos',()=>{
  it('no importa ni reemplaza el jardín local al entrar o salir de la cuenta',async()=>{
    const local=emptyHabitState('UTC');localStorage.setItem(HABITS_KEY,JSON.stringify(local))
    localStorage.setItem(PREVIEW_KEY,JSON.stringify({petId:'seti',petName:'Local'}))
    const habits=useHabitsStore();const preview=usePreviewStore();const account=useAccountStore()
    expect(preview.profile?.petName).toBe('Local')
    account.mode=true;await account.refresh()
    expect(preview.profile?.petName).toBe('Flor');expect(habits.state.timezone).toBe('UTC')
    await account.logout();expect(account.garden).toBeNull();expect(account.ready).toBe(false)
    account.mode=false;expect(preview.profile?.petName).toBe('Local')
    expect(localStorage.getItem(HABITS_KEY)).toBe(JSON.stringify(local))
    expect(JSON.parse(localStorage.getItem(PREVIEW_KEY)!).petName).toBe('Local')
  })
  it('borra inmediatamente el estado privado al cambiar de identidad',async()=>{
    const account=useAccountStore();await account.refresh();expect(account.garden?.userId).toBe(first)
    event('SIGNED_IN',session(second))
    expect(account.userId).toBe(second);expect(account.garden).toBeNull();expect(account.ready).toBe(false)
  })
  it('descarta una lectura que termina después de cerrar sesión',async()=>{
    let resolve!:(value:unknown)=>void
    mock.rpc.mockImplementation(()=>new Promise(r=>{resolve=r}))
    const account=useAccountStore();const loading=account.refresh()
    await vi.waitFor(()=>expect(mock.rpc).toHaveBeenCalled())
    event('SIGNED_OUT',null);resolve({data:snapshot(),error:null});await loading
    expect(account.garden).toBeNull();expect(account.ready).toBe(false)
  })
  it('rechaza una respuesta de otro propietario',async()=>{
    mock.rpc.mockResolvedValue({data:snapshot(second),error:null})
    const account=useAccountStore();await expect(account.refresh()).rejects.toThrow('verificar')
    expect(account.ready).toBe(false);expect(account.garden).toBeNull()
  })
  it('nunca escribe ni crea perfil dentro del callback de autenticación',async()=>{
    const account=useAccountStore();await account.initialize();event('SIGNED_IN',session(second))
    expect(mock.rpc).not.toHaveBeenCalled()
  })
})
describe('guardado remoto confirmado',()=>{
  it('no modifica el tablero si el servidor rechaza el cambio',async()=>{
    const account=useAccountStore();account.mode=true;await account.refresh()
    mock.rpc.mockResolvedValue({data:null,error:{code:'40001',message:'stale'}})
    await expect(account.mutate('brotito_comprar',{p_accesorio:'corona'})).rejects.toThrow('cambiaron')
    expect(account.garden?.state.commerce.purchases).toHaveLength(0);expect(account.ready).toBe(false)
    expect(mock.rpc).toHaveBeenLastCalledWith('brotito_comprar',{p_accesorio:'corona',p_revision:4,p_fecha:'2026-10-20'})
    expect(mock.headers).toHaveBeenLastCalledWith('Authorization',`Bearer test-${first}`)
  })
  it('no informa éxito de pantalla cuando el cambio se guardó pero falló la lectura posterior',async()=>{
    const account=useAccountStore();await account.refresh()
    mock.rpc.mockImplementation(async(name)=>name==='brotito_jardin'?{error:{message:'Failed to fetch'},data:null}:{error:null,data:'saved'})
    await expect(account.mutate('brotito_comprar',{p_accesorio:'panuelo'})).rejects.toThrow('El cambio se guardó')
    expect(account.ready).toBe(false);expect(account.warning).toContain('falta actualizar')
  })
  it('espera al servidor antes de mostrar el nuevo jardín',async()=>{
    const account=useAccountStore();await account.refresh()
    let complete!:(value:unknown)=>void;const updated=snapshot();updated.revision=5;updated.totals.saldo=35
    mock.rpc.mockImplementation((name)=>name==='brotito_comprar'?new Promise(r=>{complete=r}):Promise.resolve({data:updated,error:null}))
    const saving=account.mutate('brotito_comprar',{p_accesorio:'panuelo'})
    expect(account.busy).toBe(true);expect(account.garden?.revision).toBe(4)
    await expect(account.mutate('brotito_comprar',{p_accesorio:'corona'})).rejects.toThrow('Espera')
    complete({data:'purchase',error:null});await saving
    expect(account.busy).toBe(false);expect(account.garden?.revision).toBe(5)
  })
  it('los cambios del almacenamiento local no sustituyen datos de cuenta',async()=>{
    const account=useAccountStore();account.mode=true;await account.refresh()
    const habits=useHabitsStore();habits.applyExternal(JSON.stringify(emptyHabitState('America/El_Salvador')))
    expect(habits.state.timezone).toBe('UTC');expect(()=>habits.clear()).toThrow('cuenta')
    expect(()=>usePreviewStore().clear()).toThrow('cuenta')
  })
  it('usa un nuevo snapshot después de una lectura anterior pendiente al guardar',async()=>{
    const account=useAccountStore();await account.refresh()
    let finishOld!:(value:unknown)=>void
    const updated=snapshot();updated.revision=5
    mock.rpc.mockImplementationOnce(()=>new Promise(r=>{finishOld=r}))
      .mockResolvedValueOnce({data:'saved',error:null}).mockResolvedValueOnce({data:updated,error:null})
    const oldRead=account.refresh();await vi.waitFor(()=>expect(mock.rpc).toHaveBeenCalledTimes(2))
    const saving=account.mutate('brotito_comprar',{p_accesorio:'panuelo'})
    finishOld({data:snapshot(),error:null});await oldRead;await saving
    expect(account.garden?.revision).toBe(5)
  })
})
