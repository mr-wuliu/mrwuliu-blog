import { drizzle } from 'drizzle-orm/d1'
import { images } from '../db/schema'
import { eq, sql } from 'drizzle-orm'

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
}

// Allowed MIME types
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
])

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

interface ImageResult {
  id: string
  url: string
  r2Key: string
  mimeType: string
  sizeBytes: number
}

// Upload an image to R2 and record it in the database
export async function uploadImage(
  env: Bindings,
  file: File,
  altText?: string,
): Promise<ImageResult> {
  // Validate file type
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Allowed: image/jpeg, image/png, image/gif, image/webp, image/svg+xml`)
  }

  // Validate file size
  if (file.size > MAX_SIZE) {
    throw new Error(`File too large: ${file.size} bytes. Maximum: ${MAX_SIZE} bytes`)
  }

  // Generate unique R2 key
  const id = crypto.randomUUID()
  const extension = file.type.split('/')[1] || 'bin'
  const r2Key = `images/${id}.${extension}`

  // Upload to R2
  const arrayBuffer = await file.arrayBuffer()
  await env.IMAGES.put(r2Key, arrayBuffer, {
    httpMetadata: {
      contentType: file.type,
    },
  })

  // Record in database
  const db = drizzle(env.DB)
  await db.insert(images).values({
    id,
    r2Key,
    altText: altText || null,
    mimeType: file.type,
    sizeBytes: file.size,
  })

  return {
    id,
    url: `/images/${r2Key}`,
    r2Key,
    mimeType: file.type,
    sizeBytes: file.size,
  }
}

// If-None-Match comparison per RFC 7232: token list, W/ weak prefix, and * wildcard
function requestMatchesEtag(ifNoneMatch: string, etag: string): boolean {
  return ifNoneMatch
    .split(',')
    .map((token) => token.trim())
    .some((token) => {
      if (token === '*') return true
      const candidate = token.startsWith('W/') ? token.slice(2) : token
      return candidate.toLowerCase() === etag.toLowerCase()
    })
}

// Serve an image from R2 with cache headers
export async function serveImage(
  env: Bindings,
  key: string,
  request?: Request,
): Promise<Response> {
  let object = await env.IMAGES.get(key)

  if (!object && key.startsWith('images/')) {
    object = await env.IMAGES.get(key.slice('images/'.length))
  }

  // Backward compatibility for author avatar key extension changes.
  // If /images/avatars/avatar.<ext> is stale, try common alternatives.
  if (!object) {
    const avatarMatch = key.match(/^avatars\/avatar\.(png|jpg|jpeg|webp|gif|svg)$/)
    if (avatarMatch) {
      const candidates = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg']
      for (const ext of candidates) {
        if (`avatars/avatar.${ext}` === key) continue
        object = await env.IMAGES.get(`avatars/avatar.${ext}`)
        if (object) break
      }
    }
  }

  // Final fallback: if avatar key suffix is stale, pick any existing avatar object.
  if (!object && key.startsWith('avatars/avatar.')) {
    const listed = await env.IMAGES.list({ prefix: 'avatars/avatar.' })
    const existing = listed.objects[0]?.key
    if (existing) {
      object = await env.IMAGES.get(existing)
    }
  }

  if (!object) {
    return new Response('Not Found', { status: 404 })
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  headers.set('ETag', object.etag)
  if (object.httpMetadata?.contentType === 'image/svg+xml') {
    headers.set('Content-Security-Policy', "default-src 'none'; sandbox")
  }

  const ifNoneMatch = request?.headers.get('if-none-match')
  if (ifNoneMatch && requestMatchesEtag(ifNoneMatch, object.etag)) {
    return new Response(null, { status: 304, headers })
  }

  headers.set('Content-Length', String(object.size))
  return new Response(object.body, { headers })
}

// Delete an image from R2 and the database
export async function deleteImage(
  env: Bindings,
  imageId: string,
): Promise<void> {
  const db = drizzle(env.DB)

  // Get the image record to find the R2 key
  const [image] = await db.select().from(images).where(eq(images.id, imageId))

  if (!image) {
    throw new Error('Image not found')
  }

  // Delete from R2
  await env.IMAGES.delete(image.r2Key)

  // Delete from database
  await db.delete(images).where(eq(images.id, imageId))
}

// List all images from the database
export async function listImages(
  env: Bindings,
  page: number = 1,
  limit: number = 20,
): Promise<{ images: Array<typeof images.$inferSelect>; total: number }> {
  const db = drizzle(env.DB)
  const offset = (page - 1) * limit

  const pageImages = await db.select().from(images).limit(limit).offset(offset)
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(images)
  const total = countResult[0]?.count ?? 0

  return {
    images: pageImages,
    total,
  }
}
