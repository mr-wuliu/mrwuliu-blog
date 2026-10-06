import { zValidator } from '@hono/zod-validator'
import { projectSchema } from '../utils/validation'
import { Hono } from 'hono'
import { createDb } from '../db'
import {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from '../db/queries'

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
}

const projectRoutes = new Hono<{ Bindings: Bindings }>()

projectRoutes.get('/', async (c) => {
  const db = createDb(c.env.DB)
  const allProjects = await getAllProjects(db)
  return c.json(allProjects)
})

projectRoutes.get('/:id', async (c) => {
  const db = createDb(c.env.DB)
  const id = c.req.param('id')
  const project = await getProjectById(db, id)
  if (!project) return c.json({ error: 'Project not found' }, 404)
  return c.json(project)
})

projectRoutes.post('/', zValidator('json', projectSchema), async (c) => {
  const db = createDb(c.env.DB)
  const body = c.req.valid('json')

  if (!body.title) return c.json({ error: 'Title is required' }, 400)

  const project = await createProject(db, body)
  return c.json(project, 201)
})

projectRoutes.put('/:id', zValidator('json', projectSchema.partial()), async (c) => {
  const db = createDb(c.env.DB)
  const id = c.req.param('id')

  const existing = await getProjectById(db, id)
  if (!existing) return c.json({ error: 'Project not found' }, 404)

  const body = c.req.valid('json')

  const project = await updateProject(db, id, body)
  return c.json(project)
})

projectRoutes.delete('/:id', async (c) => {
  const db = createDb(c.env.DB)
  const id = c.req.param('id')

  const existing = await getProjectById(db, id)
  if (!existing) return c.json({ error: 'Project not found' }, 404)

  await deleteProject(db, id)
  return c.json({ success: true })
})

export default projectRoutes
