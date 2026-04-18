import { Hono } from 'hono'
import { createDb } from '../db'
import {
  getAllCollections,
  getCollectionById,
  getCollectionWithPosts,
  createCollection,
  updateCollection,
  deleteCollection,
  getPostCollections,
} from '../db/queries'

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
}

const collectionRoutes = new Hono<{ Bindings: Bindings }>()

collectionRoutes.get('/', async (c) => {
  const db = createDb(c.env.DB)
  const result = await getAllCollections(db)
  return c.json({ collections: result })
})

collectionRoutes.get('/by-post/:postId', async (c) => {
  const db = createDb(c.env.DB)
  const postId = c.req.param('postId')
  const postCollections = await getPostCollections(db, postId)
  const collectionsWithPosts = await Promise.all(
    postCollections.map(async (col) => {
      const full = await getCollectionWithPosts(db, col.id)
      return full
    })
  )
  const result = collectionsWithPosts.filter((c) => c !== null)
  return c.json({ collections: result })
})

collectionRoutes.get('/:id', async (c) => {
  const db = createDb(c.env.DB)
  const id = c.req.param('id')
  const collection = await getCollectionWithPosts(db, id)
  if (!collection) return c.json({ error: 'Collection not found' }, 404)
  return c.json({ collection })
})

collectionRoutes.post('/', async (c) => {
  const db = createDb(c.env.DB)
  const body = await c.req.json<{
    name: string
    nameEn?: string
    slug: string
    description?: string
    descriptionEn?: string
    coverImageKey?: string
    sortOrder?: number
    status?: 'draft' | 'published'
    postIds?: string[]
  }>()

  if (!body.name || !body.slug) return c.json({ error: 'Name and slug are required' }, 400)

  const collection = await createCollection(db, body)
  return c.json({ collection }, 201)
})

collectionRoutes.put('/:id', async (c) => {
  const db = createDb(c.env.DB)
  const id = c.req.param('id')

  const existing = await getCollectionById(db, id)
  if (!existing) return c.json({ error: 'Collection not found' }, 404)

  const body = await c.req.json<{
    name?: string
    nameEn?: string
    slug?: string
    description?: string
    descriptionEn?: string
    coverImageKey?: string
    sortOrder?: number
    status?: 'draft' | 'published'
    postIds?: string[]
  }>()

  const collection = await updateCollection(db, id, body)
  return c.json({ collection })
})

collectionRoutes.delete('/:id', async (c) => {
  const db = createDb(c.env.DB)
  const id = c.req.param('id')

  const existing = await getCollectionById(db, id)
  if (!existing) return c.json({ error: 'Collection not found' }, 404)

  await deleteCollection(db, id)
  return c.json({ success: true })
})

export default collectionRoutes
