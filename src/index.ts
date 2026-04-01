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
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', logger())

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
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
  if (url.pathname === '/admin' || url.pathname === '/admin/') {
    return c.redirect('/admin/login')
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
