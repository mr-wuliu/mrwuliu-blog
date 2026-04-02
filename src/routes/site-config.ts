import { Hono } from 'hono'
import { createDb } from '../db'
import { getSiteConfig, upsertSiteConfig } from '../db/queries'
import { siteConfig } from '../db/schema'

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
}

const ALLOWED_AVATAR_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
])

const MAX_AVATAR_SIZE = 5 * 1024 * 1024

function extensionFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/gif':
      return 'gif'
    case 'image/webp':
      return 'webp'
    case 'image/svg+xml':
      return 'svg'
    default:
      return 'bin'
  }
}

const siteConfigRoutes = new Hono<{ Bindings: Bindings }>()

siteConfigRoutes.get('/', async (c) => {
  const db = createDb(c.env.DB)
  const allConfigs = await db.select().from(siteConfig)
  return c.json(allConfigs)
})

siteConfigRoutes.get('/:key', async (c) => {
  const db = createDb(c.env.DB)
  const key = c.req.param('key')
  const config = await getSiteConfig(db, key)
  if (!config) return c.json({ error: 'Config not found' }, 404)
  return c.json(config)
})

siteConfigRoutes.put('/', async (c) => {
  const db = createDb(c.env.DB)
  const { key, value } = await c.req.json<{ key: string; value: string }>()
  if (!key) return c.json({ error: 'Key is required' }, 400)
  const config = await upsertSiteConfig(db, { key, value })
  return c.json(config)
})

siteConfigRoutes.post('/avatar-upload', async (c) => {
  try {
    const body = await c.req.parseBody()
    const file = body['file']

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file provided. Use multipart/form-data with "file" field.' }, 400)
    }

    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      return c.json({ error: `Invalid file type: ${file.type}` }, 400)
    }

    if (file.size > MAX_AVATAR_SIZE) {
      return c.json({ error: 'File too large. Maximum: 5MB' }, 400)
    }

    const db = createDb(c.env.DB)
    const oldConfig = await getSiteConfig(db, 'author_avatar')
    const oldAvatarUrl = oldConfig?.value || ''

    const extension = extensionFromMimeType(file.type)
    const r2Key = `avatars/avatar-${Date.now()}.${extension}`
    const arrayBuffer = await file.arrayBuffer()
    await c.env.IMAGES.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    })

    if (oldAvatarUrl.includes('/images/avatars/')) {
      const oldKey = oldAvatarUrl.replace('/images/', '')
      if (oldKey && oldKey !== r2Key) {
        await c.env.IMAGES.delete(oldKey)
      }
    }

    const avatarUrl = `/images/${r2Key}`
    await upsertSiteConfig(db, { key: 'author_avatar', value: avatarUrl })

    return c.json({ url: avatarUrl })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Upload failed'
    return c.json({ error: message }, 400)
  }
})

export default siteConfigRoutes
