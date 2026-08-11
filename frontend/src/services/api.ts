const BASE_URL = '/api'

export interface HelloResponse {
  message: string
  serverTimeUtc: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
    ...init,
  })
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }
  return (await response.json()) as T
}

export function getHello(): Promise<HelloResponse> {
  return request<HelloResponse>('/hello')
}
