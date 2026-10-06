import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToString } from 'hono/jsx/dom/server'
import LoginPage from '../../src/views/login'
import { safeNextPath, scriptJson } from '../../src/utils/html'
import { highlightCode } from '../../src/utils/highlight'
import { verifyAccessToken } from '../../src/utils/access'

afterEach(() => vi.restoreAllMocks())
describe('HTML and Access security', () => {
  it('rejects external redirects and safely serializes script terminators', () => {
    for (const path of ['//evil.example', '/\\evil.example', 'https://evil.example', 'javascript:alert(1)', '/\n/evil.example']) {
      expect(safeNextPath(path)).toBe('/')
    }
    expect(safeNextPath('/admin/posts?tab=draft')).toBe('/admin/posts?tab=draft')
    const value = "</script><script>window.injected=true</script>\u2028"
    expect(JSON.parse(scriptJson(value))).toBe(value)
    expect(scriptJson(value)).not.toContain('<')
    const html = renderToString(<LoginPage lang="zh" nextPath={'/' + value} />)
    expect(html).not.toContain('<script>window.injected=true</script>')
  })

  it('keeps decoded markup inert in Mermaid and oversized plain code blocks', () => {
    const payload = '&lt;img src=x onerror=alert(1)&gt;&amp;'
    for (const code of [`<pre><code class="language-mermaid">${payload}</code></pre>`, `<pre><code>${'x'.repeat(10001)}${payload}</code></pre>`]) {
      const rendered = highlightCode(code)
      expect(rendered).not.toContain('<img src=x')
      expect(rendered).toContain('&lt;img src=x onerror=alert(1)&gt;&amp;')
    }
  })

  it('requires a valid signature, issuer, audience, expiry, and algorithm for Access', async () => {
    const keys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])
    const jwk = await crypto.subtle.exportKey('jwk', keys.publicKey)
    const kid = crypto.randomUUID()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ keys: [{ ...jwk, kid }] })))
    const issuer = 'https://security-test.cloudflareaccess.com'
    const env = { ACCESS_TEAM_DOMAIN: issuer, ACCESS_AUD: 'trusted-app' }
    const encode = (value: Uint8Array) => btoa(String.fromCharCode(...value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const token = async (claims: object, alg = 'RS256') => {
      const input = [encode(new TextEncoder().encode(JSON.stringify({ alg, kid }))), encode(new TextEncoder().encode(JSON.stringify(claims)))].join('.')
      const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keys.privateKey, new TextEncoder().encode(input))
      return input + '.' + encode(new Uint8Array(signature))
    }
    const claims = { iss: issuer, aud: ['trusted-app'], exp: Math.floor(Date.now() / 1000) + 60 }
    const valid = await token(claims)
    expect(await verifyAccessToken(valid, env)).toBe(true)
    expect(await verifyAccessToken(valid.replace(/.$/, '!'), env)).toBe(false)
    expect(await verifyAccessToken(await token({ ...claims, aud: ['other-app'] }), env)).toBe(false)
    expect(await verifyAccessToken(await token({ ...claims, iss: 'https://evil.example' }), env)).toBe(false)
    expect(await verifyAccessToken(await token({ ...claims, exp: 1 }), env)).toBe(false)
    expect(await verifyAccessToken(await token(claims, 'HS256'), env)).toBe(false)
    expect(await verifyAccessToken(valid, {})).toBe(false)
  })
})
