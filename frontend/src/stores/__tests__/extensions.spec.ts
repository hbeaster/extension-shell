import { describe, it, expect, vi, beforeEach } from 'vitest'

import { createPinia, setActivePinia } from 'pinia'
import { useExtensionsStore } from '../extensions'
import { getExtensionRegistry, type ExtensionManifest } from '@/services/extensions'

vi.mock('@/services/extensions')

const manifests: ExtensionManifest[] = [
  {
    id: 'smiley-face',
    name: 'Smiley Face',
    tag: 'ext-smiley-face',
    module: '/extensions/smiley-face/smiley-face.js',
    icon: '/extensions/smiley-face/icon.svg',
  },
]

describe('extensions store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(getExtensionRegistry).mockResolvedValue(manifests)
  })

  it('starts empty and not loaded', () => {
    const store = useExtensionsStore()
    expect(store.extensions).toEqual([])
    expect(store.loaded).toBe(false)
  })

  it('load() populates extensions and marks the store loaded', async () => {
    const store = useExtensionsStore()
    await store.load()
    expect(store.extensions).toEqual(manifests)
    expect(store.loaded).toBe(true)
  })

  it('byId finds a manifest and returns undefined for unknown ids', async () => {
    const store = useExtensionsStore()
    await store.load()
    expect(store.byId('smiley-face')).toEqual(manifests[0])
    expect(store.byId('nope')).toBeUndefined()
  })
})
