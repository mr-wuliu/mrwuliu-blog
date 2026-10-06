type AccessEnv = { ACCESS_TEAM_DOMAIN?: string; ACCESS_AUD?: string }
type SigningKey = JsonWebKey & { kid?: string }
const keySets = new Map<string, { keys: SigningKey[]; expires: number }>()

function decode(value: string): Uint8Array {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

export async function verifyAccessToken(token: string | undefined, env: AccessEnv): Promise<boolean> {
  if (!token || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return false
  try {
    const issuer = new URL(env.ACCESS_TEAM_DOMAIN.startsWith('https://') ? env.ACCESS_TEAM_DOMAIN : `https://${env.ACCESS_TEAM_DOMAIN}`)
    if (issuer.protocol !== 'https:' || !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer.hostname)) return false
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const header = JSON.parse(new TextDecoder().decode(decode(parts[0]))) as { alg?: string; kid?: string }
    const claims = JSON.parse(new TextDecoder().decode(decode(parts[1]))) as { iss?: string; aud?: unknown; exp?: number; nbf?: number }
    const now = Date.now() / 1000
    if (header.alg !== 'RS256' || !header.kid || claims.iss !== issuer.origin
      || !Number.isFinite(claims.exp) || claims.exp! <= now
      || (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now))
      || !Array.isArray(claims.aud) || !claims.aud.includes(env.ACCESS_AUD)) return false
    let cached = keySets.get(issuer.origin)
    if (!cached || cached.expires <= Date.now() || !cached.keys.some(key => key.kid === header.kid)) {
      const response = await fetch(`${issuer.origin}/cdn-cgi/access/certs`, { signal: AbortSignal.timeout(5000) })
      if (!response.ok) return false
      const data = await response.json() as { keys: SigningKey[] }
      if (!Array.isArray(data.keys)) return false
      cached = { keys: data.keys, expires: Date.now() + 300000 }
      keySets.set(issuer.origin, cached)
    }
    const jwk = cached.keys.find(key => key.kid === header.kid)
    if (!jwk) return false
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
    return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(parts[2]).buffer as ArrayBuffer, new TextEncoder().encode(`${parts[0]}.${parts[1]}`))
  } catch {
    return false
  }
}
