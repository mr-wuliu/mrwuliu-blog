/**
 * HMAC-SHA256 token signing/verification for unsubscribe links.
 * Uses Web Crypto API (available natively in Cloudflare Workers).
 */

function base64UrlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(str: string): ArrayBuffer {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)
  const binary = atob(padded)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return buffer
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

/**
 * Sign a payload string with HMAC-SHA256.
 * Returns `base64url(hmac).payload`
 */
export async function signToken(payload: string, secret: string): Promise<string> {
  const key = await getKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return `${base64UrlEncode(sig)}.${payload}`
}

/**
 * Verify a token signed by signToken.
 * Returns the payload if valid, null otherwise.
 */
export async function verifyToken(token: string, secret: string): Promise<string | null> {
  const dotIndex = token.indexOf('.')
  if (dotIndex === -1) return null

  const sigPart = token.substring(0, dotIndex)
  const payload = token.substring(dotIndex + 1)

  try {
    const key = await getKey(secret)
    const sigBytes = base64UrlDecode(sigPart)
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(payload))
    return valid ? payload : null
  } catch {
    return null
  }
}
