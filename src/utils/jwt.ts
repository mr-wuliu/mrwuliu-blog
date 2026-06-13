export interface JwtClaims {
  sub: string
  email: string
  name: string
  role: 'user' | 'admin'
  type: 'access' | 'refresh'
  iat: number
  exp: number
  jti?: string
}

const HEADER = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

function base64UrlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function signJwt(
  claims: Omit<JwtClaims, 'iat'>,
  secret: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const fullClaims: JwtClaims = { ...claims, iat: now }

  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(fullClaims)))
  const signingInput = `${HEADER}.${payloadB64}`

  const key = await getKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput))

  return `${signingInput}.${base64UrlEncode(sig)}`
}

export async function verifyJwt(
  token: string,
  secret: string,
): Promise<JwtClaims | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [headerB64, payloadB64, sigB64] = parts
  const signingInput = `${headerB64}.${payloadB64}`

  try {
    const key = await getKey(secret)
    const sigBytes = base64UrlDecode(sigB64)
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes.buffer as ArrayBuffer,
      new TextEncoder().encode(signingInput),
    )
    if (!valid) return null

    const claims = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64)),
    ) as JwtClaims

    const now = Math.floor(Date.now() / 1000)
    if (claims.exp < now) return null

    return claims
  } catch {
    return null
  }
}

export function generateJti(): string {
  return crypto.randomUUID()
}
