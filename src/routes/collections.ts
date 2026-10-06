import { zValidator } from '@hono/zod-validator'
import { collectionSchema } from '../utils/validation'
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
  getBatchCollectionsWithPosts,
} from '../db/queries'

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
}

const collectionRoutes = new Hono<{ Bindings: Bindings }>()
collectionRoutes.onError((error, c) => {
  const message = String(error.cause ?? error)
  if (message.includes('UNIQUE')) return c.json({ error: 'Collection slug already exists' }, 409)
  if (message.includes('FOREIGN KEY')) return c.json({ error: 'One or more posts do not exist' }, 400)
  throw error
})

collectionRoutes.get('/', async (c) => {
  const db = createDb(c.env.DB)
  const result = await getAllCollections(db)
  return c.json({ collections: result })
})

collectionRoutes.get('/by-post/:postId', async (c) => {
  const db = createDb(c.env.DB)
  const postId = c.req.param('postId')
  const postCollections = await getPostCollections(db, postId)
  const result = await getBatchCollectionsWithPosts(db, postCollections.map(collection => collection.id), false)
  return c.json({ collections: result })
})

collectionRoutes.get('/:id', async (c) => {
  const db = createDb(c.env.DB)
  const id = c.req.param('id')
  const collection = await getCollectionWithPosts(db, id)
  if (!collection) return c.json({ error: 'Collection not found' }, 404)
  return c.json({ collection })
})

collectionRoutes.post('/', zValidator('json', collectionSchema), async (c) => {
  const db = createDb(c.env.DB)
  const body = c.req.valid('json')

  if (!body.name || !body.slug) return c.json({ error: 'Name and slug are required' }, 400)

  const collection = await createCollection(db, body)
  return c.json({ collection }, 201)
})

collectionRoutes.put('/:id', zValidator('json', collectionSchema.partial()), async (c) => {
  const db = createDb(c.env.DB)
  const id = c.req.param('id')

  const existing = await getCollectionById(db, id)
  if (!existing) return c.json({ error: 'Collection not found' }, 404)

  const body = c.req.valid('json')

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
