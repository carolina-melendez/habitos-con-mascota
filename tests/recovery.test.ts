import {flushPromises,mount} from '@vue/test-utils'
import {beforeEach,describe,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({
  account:{recovery:true,session:{user:{id:'test'}},warning:'',callback:vi.fn(),resetPassword:vi.fn(),logout:vi.fn(),refresh:vi.fn()},
  route:{path:'/cuenta/restablecer',query:{} as Record<string,string>},replace:vi.fn(),
}))
vi.mock('../src/stores/account',()=>({useAccountStore:()=>mocks.account}))
vi.mock('vue-router',()=>({useRoute:()=>mocks.route,useRouter:()=>({replace:mocks.replace})}))
import AccountCallbackView from '../src/views/AccountCallbackView.vue'
import {accountError} from '../src/domain/account'
async function setup(){const view=mount(AccountCallbackView,{props:{recovery:true},global:{stubs:{GardenLink:{template:'<a><slot /></a>'}}}});await flushPromises();return view}
beforeEach(()=>{
  vi.resetAllMocks();mocks.account.recovery=true;mocks.route.query={}
  mocks.account.resetPassword.mockResolvedValue(true);mocks.account.logout.mockResolvedValue(undefined);mocks.replace.mockResolvedValue(undefined)
})
describe('recuperación de contraseña',()=>{
  it('sin enlace ni sesión de recuperación no ofrece cambiar la contraseña',async()=>{
    mocks.account.recovery=false;mocks.account.callback.mockRejectedValue(new Error('El enlace está incompleto.'))
    const view=await setup();expect(view.find('#new-password').exists()).toBe(false)
    expect(view.text()).toContain('Solicitar otro enlace');expect(mocks.account.resetPassword).not.toHaveBeenCalled()
  })
  it('retira el código de la dirección tras verificar el enlace',async()=>{
    mocks.route.query={code:'one-time-test-code'};mocks.account.callback.mockResolvedValue(undefined)
    const view=await setup();expect(mocks.account.callback).toHaveBeenCalledWith('one-time-test-code',true)
    expect(mocks.replace).toHaveBeenCalledWith({path:'/cuenta/restablecer',query:{}});expect(view.find('#new-password').exists()).toBe(true)
  })
  it('rechaza contraseñas cortas o distintas antes de enviarlas',async()=>{
    const view=await setup();await view.find('#new-password').setValue('short');await view.find('form').trigger('submit')
    expect(view.text()).toContain('al menos 8');await view.find('#new-password').setValue('test-only-123')
    await view.find('#repeat-password').setValue('different');await view.find('form').trigger('submit')
    expect(view.text()).toContain('no coinciden');expect(mocks.account.resetPassword).not.toHaveBeenCalled()
  })
  it('espera confirmación y retira el formulario después de guardar',async()=>{
    const view=await setup();await view.find('#new-password').setValue('test-only-123');await view.find('#repeat-password').setValue('test-only-123')
    await view.find('form').trigger('submit');await flushPromises()
    expect(view.text()).toContain('Contraseña actualizada');expect(view.find('#new-password').exists()).toBe(false)
  })
  it('si falla el cierre reintenta solo cerrar, sin volver a cambiar la contraseña',async()=>{
    mocks.account.resetPassword.mockResolvedValue(false)
    const view=await setup();await view.find('#new-password').setValue('test-only-123');await view.find('#repeat-password').setValue('test-only-123')
    await view.find('form').trigger('submit');await flushPromises()
    expect(view.text()).toContain('No necesitas cambiarla otra vez')
    const button=view.findAll('button').find(button=>button.text()==='Cerrar sesión para continuar')!
    await button.trigger('click');await flushPromises()
    expect(mocks.account.logout).toHaveBeenCalledTimes(1);expect(mocks.account.resetPassword).toHaveBeenCalledTimes(1)
    expect(view.text()).toContain('Inicia sesión con tu nueva contraseña')
  })
  it('explica errores de contraseña y las restricciones de envío',()=>{
    expect(accountError({code:'same_password'})).toContain('diferente')
    expect(accountError({code:'weak_password'})).toContain('requisitos')
    expect(accountError({code:'email_address_not_authorized'})).toContain('modo de pruebas')
  })
})
