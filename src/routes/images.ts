import { Hono } from 'hono'
import { uploadImage, serveImage, deleteImage, listImages } from '../services/image'

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
}

const imageRoutes = new Hono<{ Bindings: Bindings }>()

imageRoutes.post('/images', async (c) => {
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

imageRoutes.get('/images', async (c) => {
  const page = Number(c.req.query('page') ?? 1)
  const limit = Number(c.req.query('limit') ?? 20)

  const result = await listImages(c.env, page, limit)
  return c.json(result)
})

imageRoutes.delete('/images/:id', async (c) => {
  try {
    await deleteImage(c.env, c.req.param('id'))
    return c.json({ success: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Delete failed'
    return c.json({ error: message }, 404)
  }
})

export default imageRoutes

export const imageServeRoutes = new Hono<{ Bindings: Bindings }>()

imageServeRoutes.get('/:key+', async (c) => {
  // Hono catch-all params are exposed as "key" (without "+") in most versions.
  // Keep a fallback to avoid broken image URLs when router param behavior changes.
  const rawPath = c.req.path
  let key = c.req.param('key') || c.req.param('key+') || rawPath.replace(/^\/+/, '')
  key = key.replace(/^\/+/, '')
  if (key.startsWith('images/')) {
    key = key.slice('images/'.length)
  }

  if (!key) {
    return new Response('Not Found', { status: 404 })
  }

  const response = await serveImage(c.env, key)
  return response
})
