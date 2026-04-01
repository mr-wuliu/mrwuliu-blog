import { Hono } from 'hono'
import { createDb } from '../db'
import { getSiteConfig, upsertSiteConfig } from '../db/queries'
import { siteConfig } from '../db/schema'

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
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

export default siteConfigRoutes
