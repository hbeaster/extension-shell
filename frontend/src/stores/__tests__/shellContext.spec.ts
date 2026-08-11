import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useShellContextStore } from '../shellContext'

describe('shell context store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults to the system preference and resolves it to a concrete theme', () => {
    const store = useShellContextStore()

    expect(store.preference).toBe('system')
    // Extensions never receive 'system' — the contract says light or dark.
    expect(store.theme).toBe('light')
  })

  it('resolves an explicit preference', () => {
    const store = useShellContextStore()

    store.preference = 'dark'
    expect(store.theme).toBe('dark')

    store.preference = 'light'
    expect(store.theme).toBe('light')
  })

  it('follows the OS when the preference is system', () => {
    const listeners: Array<(event: MediaQueryListEvent) => void> = []
    const emitSystemChange = (matches: boolean) => {
      for (const listener of listeners) {
        listener({ matches } as MediaQueryListEvent)
      }
    }
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: (_: string, cb: (event: MediaQueryListEvent) => void) => listeners.push(cb),
      removeEventListener: () => {},
    }))
    setActivePinia(createPinia())
    const store = useShellContextStore()

    expect(store.theme).toBe('dark')

    const stop = store.watchSystemTheme()
    expect(listeners).toHaveLength(1)

    emitSystemChange(false)
    expect(store.theme).toBe('light')

    // An explicit choice wins over the OS.
    store.preference = 'dark'
    emitSystemChange(false)
    expect(store.theme).toBe('dark')

    stop()
  })

  it('survives an environment without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined)
    setActivePinia(createPinia())
    const store = useShellContextStore()

    expect(store.theme).toBe('light')
    expect(() => store.watchSystemTheme()()).not.toThrow()
  })

  it('takes the locale from the browser', () => {
    const store = useShellContextStore()

    expect(store.locale).toBe(navigator.language)
  })
})
