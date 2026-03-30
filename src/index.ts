import { Hono } from 'hono'
import { logger } from 'hono/logger'
import authRoutes from './routes/auth'
import tagRoutes from './routes/tags'
import postRoutes from './routes/posts'
import commentRoutes from './routes/comments'
import imageRoutes, { imageServeRoutes } from './routes/images'

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
  JWT_SECRET: string
  ADMIN_USERNAME: string
  ADMIN_PASSWORD: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', logger())

app.get('/', (c) => {
  return c.text('Blog is running')
})

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.route('/api/auth', authRoutes)
app.route('/api/tags', tagRoutes)
app.route('/api/posts', postRoutes)
app.route('/api', commentRoutes)
app.route('/api', imageRoutes)
app.route('/images', imageServeRoutes)

export default app
