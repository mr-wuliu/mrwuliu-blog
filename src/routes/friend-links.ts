import { zValidator } from '@hono/zod-validator'
import { friendLinkSchema } from '../utils/validation'
import { Hono } from 'hono'
import { createDb } from '../db'
import {
  getAllFriendLinks,
  getFriendLinkById,
  createFriendLink,
  updateFriendLink,
  deleteFriendLink,
} from '../db/queries'

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
}

const friendLinkRoutes = new Hono<{ Bindings: Bindings }>()

friendLinkRoutes.get('/', async (c) => {
  const db = createDb(c.env.DB)
  const allLinks = await getAllFriendLinks(db)
  return c.json(allLinks)
})

friendLinkRoutes.get('/:id', async (c) => {
  const db = createDb(c.env.DB)
  const id = c.req.param('id')
  const link = await getFriendLinkById(db, id)
  if (!link) return c.json({ error: 'Friend link not found' }, 404)
  return c.json(link)
})

friendLinkRoutes.post('/', zValidator('json', friendLinkSchema), async (c) => {
  const db = createDb(c.env.DB)
  const body = c.req.valid('json')

  if (!body.name) return c.json({ error: 'Name is required' }, 400)
  if (!body.url) return c.json({ error: 'URL is required' }, 400)

  const link = await createFriendLink(db, body)
  return c.json(link, 201)
})

friendLinkRoutes.put('/:id', zValidator('json', friendLinkSchema.partial()), async (c) => {
  const db = createDb(c.env.DB)
  const id = c.req.param('id')

  const existing = await getFriendLinkById(db, id)
  if (!existing) return c.json({ error: 'Friend link not found' }, 404)

  const body = c.req.valid('json')

  const link = await updateFriendLink(db, id, body)
  return c.json(link)
})

friendLinkRoutes.delete('/:id', async (c) => {
  const db = createDb(c.env.DB)
  const id = c.req.param('id')

  const existing = await getFriendLinkById(db, id)
  if (!existing) return c.json({ error: 'Friend link not found' }, 404)

  await deleteFriendLink(db, id)
  return c.json({ success: true })
})

export default friendLinkRoutes
