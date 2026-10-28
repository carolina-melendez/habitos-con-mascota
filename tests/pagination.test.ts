import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PaginatedList from '../src/components/PaginatedList.vue'

describe('listas paginadas', () => {
  const items = Array.from({ length: 13 }, (_, i) => i + 1)
  const render = (values = items) => mount(PaginatedList, {
    props: { items: values, label: 'hábitos', resetKey: 'hoy' },
    slots: { default: ({ items }: { items: unknown[] }) => items.join(',') },
  })
  it('muestra cinco elementos, permite llegar al último y respeta los límites', async () => {
    const wrapper = render()
    const previous = wrapper.get('button[aria-label="Página anterior de hábitos"]')
    const next = wrapper.get('button[aria-label="Página siguiente de hábitos"]')
    expect(previous.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('1,2,3,4,5')
    await next.trigger('click')
    expect(wrapper.text()).toContain('6,7,8,9,10')
    await next.trigger('click')
    expect(wrapper.get('[role="status"]').text()).toBe('11–13 de 13')
    expect(next.attributes('disabled')).toBeDefined()
    await previous.trigger('click')
    expect(wrapper.text()).toContain('6,7,8,9,10')
  })
  it('ajusta la página si se retiran elementos y reinicia al cambiar la fecha o búsqueda', async () => {
    const wrapper = render()
    await wrapper.get('button[aria-label="Página siguiente de hábitos"]').trigger('click')
    await wrapper.setProps({ items: items.slice(0, 5) })
    expect(wrapper.find('nav').exists()).toBe(false)
    expect(wrapper.text()).toContain('1,2,3,4,5')
    await wrapper.setProps({ items })
    await wrapper.get('button[aria-label="Página siguiente de hábitos"]').trigger('click')
    await wrapper.setProps({ resetKey: 'mañana' })
    expect(wrapper.text()).toContain('1,2,3,4,5')
  })
  it('oculta los controles en listas vacías o de una página', () => {
    expect(render([]).find('nav').exists()).toBe(false)
    expect(render(items.slice(0, 5)).find('nav').exists()).toBe(false)
  })
})

