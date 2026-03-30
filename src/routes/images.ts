import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { uploadImage, serveImage, deleteImage, listImages } from '../services/image'

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
  JWT_SECRET: string
  ADMIN_USERNAME: string
  ADMIN_PASSWORD: string
}

const imageRoutes = new Hono<{ Bindings: Bindings }>()

// POST /api/images — Upload image (protected)
imageRoutes.post('/images', authMiddleware, async (c) => {
  try {
    const body = await c.req.parseBody()
    const file = body['file']

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file provided. Use multipart/form-data with "file" field.' }, 400)
    }

    const result = await uploadImage(c.env, file)
    return c.json(result, 201)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Upload failed'
    return c.json({ error: message }, 400)
  }
})

// GET /api/images — List images (protected)
imageRoutes.get('/images', authMiddleware, async (c) => {
  const page = Number(c.req.query('page') ?? 1)
  const limit = Number(c.req.query('limit') ?? 20)

  const result = await listImages(c.env, page, limit)
  return c.json(result)
})

// DELETE /api/images/:id — Delete image (protected)
imageRoutes.delete('/images/:id', authMiddleware, async (c) => {
  try {
    await deleteImage(c.env, c.req.param('id'))
    return c.json({ success: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Delete failed'
    return c.json({ error: message }, 404)
  }
})

export default imageRoutes

// Separate route for public image serving (mounted at /images, not /api/images)
export const imageServeRoutes = new Hono<{ Bindings: Bindings }>()

// GET /images/:key+ — Serve image from R2 (public)
imageServeRoutes.get('/:key+', async (c) => {
  const key = c.req.param('key+')
  const response = await serveImage(c.env, key)
  return response
})
