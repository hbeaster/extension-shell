import { describe, it, expect, vi, afterEach } from 'vitest'

import { getExtensionRegistry } from '../extensions'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('getExtensionRegistry', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the extension list from a valid registry', async () => {
    const registry = {
      extensions: [
        {
          id: 'buzzer',
          name: 'Buzzer',
          tag: 'ext-buzzer',
          module: '/extensions/buzzer/buzzer.js',
          icon: '/extensions/buzzer/icon.svg',
        },
      ],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(registry)))

    await expect(getExtensionRegistry()).resolves.toEqual(registry.extensions)
  })

  it('returns an empty list when the SPA fallback answers with index.html', async () => {
    const fallback = new Response('<!doctype html><html></html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fallback))

    await expect(getExtensionRegistry()).resolves.toEqual([])
  })

  it('returns an empty list on a non-ok response', async () => {
    const error = new Response('{}', {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(error))

    await expect(getExtensionRegistry()).resolves.toEqual([])
  })

  it('returns an empty list when the network request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network error')))

    await expect(getExtensionRegistry()).resolves.toEqual([])
  })

  it('returns an empty list when the payload has no extensions array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ something: 'else' })))

    await expect(getExtensionRegistry()).resolves.toEqual([])
  })
})
