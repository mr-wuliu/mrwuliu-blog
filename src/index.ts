import { Hono } from 'hono'
import { logger } from 'hono/logger'
import tagRoutes from './routes/tags'
import postRoutes from './routes/posts'
import commentRoutes from './routes/comments'
import imageRoutes, { imageServeRoutes } from './routes/images'
import blogRoutes from './routes/blog'
import siteConfigRoutes from './routes/site-config'
import projectsRoutes from './routes/projects'

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
  API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', logger())

app.use('*', async (c, next) => {
  await next()
  const res = c.res
  const headers = new Headers(res.headers)
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  c.res = new Response(res.body, { status: res.status, statusText: res.statusText, headers })
})

app.use('/api/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': 'https://mrwuliu.top',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  // Allow: valid API Key (machine access) OR Cloudflare Zero Trust identity (browser access)
  const apiKey = c.req.header('X-API-Key')
  const hasApiKey = apiKey && apiKey === c.env.API_KEY
  const hasZeroTrustIdentity = !!c.req.header('Cf-Access-Jwt-Assertion') || !!c.req.header('Cf-Authorization')

  if (!hasApiKey && !hasZeroTrustIdentity) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  await next()
  const res = c.res
  const headers = new Headers(res.headers)
  headers.set('Access-Control-Allow-Origin', 'https://mrwuliu.top')
  headers.set('Access-Control-Allow-Credentials', 'true')
  c.res = new Response(res.body, { status: res.status, statusText: res.statusText, headers })
})

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/favicon.ico', (c) => {
  return c.redirect('/favicon.svg', 301)
})

app.route('/', blogRoutes)

app.route('/api/tags', tagRoutes)
app.route('/api/posts', postRoutes)
app.route('/api', commentRoutes)
app.route('/api', imageRoutes)
app.route('/images', imageServeRoutes)
app.route('/api/site-config', siteConfigRoutes)
app.route('/api/projects', projectsRoutes)

app.get('/admin/*', async (c) => {
  const url = new URL(c.req.url)
  if (url.pathname === '/admin') {
    return c.redirect('/admin/')
  }
  if (url.pathname.includes('/assets/')) {
    return c.env.ASSETS.fetch(c.req.raw)
  }
  const indexUrl = new URL('/admin/index.html', c.req.url)
  const response = await c.env.ASSETS.fetch(new Request(indexUrl))
  return new Response(response.body, {
    status: response.status,
    headers: { 'Content-Type': 'text/html' },
  })
})

export default app
