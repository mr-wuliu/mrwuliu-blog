import { z } from 'zod'

export const statusSchema = z.enum(['draft', 'published'])
export const slugSchema = z.string().trim().min(1).max(200).regex(/^[\p{L}\p{N}_-]+$/u)
export const httpUrlSchema = z.string().max(2048).url().refine(value => /^https?:\/\//i.test(value), 'Only HTTP(S) URLs are allowed')
const optionalUrl = z.union([httpUrlSchema, z.literal('')]).optional()
const imageKey = z.string().max(500).optional()
const sortOrder = z.number().int().min(0).max(100000).optional()
export const projectSchema = z.object({
  title: z.string().trim().min(1).max(200), description: z.string().max(5000).optional(),
  url: optionalUrl, coverImageKey: imageKey, techStack: z.string().max(500).optional(),
  sortOrder, status: statusSchema.optional(),
})
export const friendLinkSchema = z.object({
  name: z.string().trim().min(1).max(200), nameEn: z.string().max(200).optional(),
  url: httpUrlSchema, avatar: optionalUrl, description: z.string().max(5000).optional(),
  descriptionEn: z.string().max(5000).optional(), sortOrder, status: statusSchema.optional(),
})
export const collectionSchema = z.object({
  name: z.string().trim().min(1).max(200), nameEn: z.string().max(200).optional(), slug: slugSchema,
  description: z.string().max(5000).optional(), descriptionEn: z.string().max(5000).optional(),
  coverImageKey: imageKey, sortOrder, status: statusSchema.optional(),
  postIds: z.array(z.string().uuid()).max(1000).transform(ids => [...new Set(ids)]).optional(),
})
export const commentSchema = z.object({
  content: z.string().trim().min(1).max(1000), parentId: z.string().uuid().optional(),
  visitorId: z.string().max(100).optional(),
})
export function positiveInteger(value: string | undefined, fallback: number, max = 1000000): number {
  const number = value === undefined ? fallback : Number(value)
  return Number.isSafeInteger(number) && number > 0 ? Math.min(number, max) : fallback
}
export function pagination(page?: string, limit?: string, defaultLimit = 20) {
  return { page: positiveInteger(page, 1), limit: positiveInteger(limit, defaultLimit, 100) }
}
export function chunks<T>(items: T[], size = 90): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size))
}
