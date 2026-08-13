import { describe, it, expect, vi, afterEach } from 'vitest'

import { flushPromises, mount } from '@vue/test-utils'
import ApiGreeting from '../ApiGreeting.vue'

function mockFetch(response: unknown, ok = true) {
  return vi.fn<typeof fetch>().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : 'Internal Server Error',
    json: () => Promise.resolve(response),
  } as Response)
}

describe('ApiGreeting', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the message from the API', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({ message: 'Hello from the API', serverTimeUtc: '2026-01-01T00:00:00Z' }),
    )
    const wrapper = mount(ApiGreeting)
    expect(wrapper.find('[data-testid="loading"]').exists()).toBe(true)

    await flushPromises()
    expect(wrapper.find('[data-testid="message"]').text()).toContain('Hello from the API')
  })

  it('renders an error when the API call fails', async () => {
    vi.stubGlobal('fetch', mockFetch(null, false))
    const wrapper = mount(ApiGreeting)

    await flushPromises()
    expect(wrapper.find('[data-testid="error"]').text()).toContain('500')
  })
})
