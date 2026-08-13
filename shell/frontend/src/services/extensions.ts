// Extension registry access. This is deliberately separate from api.ts:
// the registry is a static asset (not an /api/* endpoint) and absence of
// extensions is a normal state, so failures resolve to an empty list
// instead of throwing.

export interface ExtensionManifest {
  id: string
  name: string
  tag: string
  module: string
  icon: string
}

export async function getExtensionRegistry(): Promise<ExtensionManifest[]> {
  let response: Response
  try {
    response = await fetch('/extensions/registry.json', {
      headers: { Accept: 'application/json' },
    })
  } catch {
    return []
  }
  // When no extensions are installed the SPA fallback answers this URL with
  // index.html and HTTP 200, so the status alone is not a reliable signal.
  const contentType = response.headers.get('content-type') ?? ''
  if (!response.ok || !contentType.includes('application/json')) {
    return []
  }
  try {
    const body = (await response.json()) as { extensions?: ExtensionManifest[] }
    return Array.isArray(body?.extensions) ? body.extensions : []
  } catch {
    return []
  }
}

// Importing the module registers the extension's custom element as a side
// effect. Kept as an indirection so tests can mock module loading.
export function loadExtensionModule(url: string): Promise<unknown> {
  return import(/* @vite-ignore */ url)
}
