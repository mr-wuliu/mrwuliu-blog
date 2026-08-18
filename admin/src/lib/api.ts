const BASE_URL = '/api'
const LOGIN_PATH = '/login'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// Single-flight session refresh so concurrent 401s only hit /auth/refresh once.
let refreshPromise: Promise<boolean> | null = null

function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch('/auth/refresh', { method: 'POST', credentials: 'include' })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

function redirectToLogin(): void {
  // Loop guard: never bounce again if we are already on (or headed to) the login page.
  if (window.location.pathname.startsWith('/login')) return
  window.location.assign(LOGIN_PATH)
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data: unknown = await response.json()
    if (data && typeof data === 'object' && 'error' in data) {
      const error = data.error
      if (typeof error === 'string' && error) return error
    }
  } catch {
    // Body was not JSON — fall through to the generic message
  }
  return `HTTP ${response.status}: ${fallback}`
}

async function request<T>(path: string, options?: RequestInit, retried = false): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (response.status === 401) {
    // One refresh attempt, one retry; still unauthorized → send to the login page.
    if (!retried && (await refreshSession())) {
      return request<T>(path, options, true)
    }
    redirectToLogin()
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response, 'Request failed'))
  }

  return response.json()
}

async function uploadFile<T>(path: string, file: File, retried = false): Promise<T> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  if (response.status === 401) {
    if (!retried && (await refreshSession())) {
      return uploadFile<T>(path, file, true)
    }
    redirectToLogin()
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response, 'Upload failed'))
  }

  return response.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  upload: <T>(path: string, file: File) => uploadFile<T>(path, file),
}
