import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// posts table
export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  content: text('content').notNull().default(''),
  excerpt: text('excerpt').notNull().default(''),
  coverImageKey: text('cover_image_key'),
  status: text('status', { enum: ['draft', 'published'] }).notNull().default('draft'),
  hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  publishedAt: text('published_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  posts_status_idx: index('posts_status_idx').on(table.status),
  posts_published_at_idx: index('posts_published_at_idx').on(table.publishedAt),
  posts_hidden_idx: index('posts_hidden_idx').on(table.hidden),
  posts_pinned_idx: index('posts_pinned_idx').on(table.pinned),
}))

// tags table
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// post_tags junction table
export const postTags = sqliteTable('post_tags', {
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
  post_tags_post_id_idx: index('post_tags_post_id_idx').on(table.postId),
  post_tags_tag_id_idx: index('post_tags_tag_id_idx').on(table.tagId),
}))

// comments table
export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  authorName: text('author_name').notNull(),
  authorEmail: text('author_email'),
  visitorId: text('visitor_id'),
  content: text('content').notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  comments_post_id_idx: index('comments_post_id_idx').on(table.postId),
  comments_status_idx: index('comments_status_idx').on(table.status),
}))

// images table (tracks R2 objects)
export const images = sqliteTable('images', {
  id: text('id').primaryKey(),
  r2Key: text('r2_key').notNull().unique(),
  altText: text('alt_text'),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// site_config table (key-value store for site settings)
export const siteConfig = sqliteTable('site_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull().default(''),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

// projects table (project cards for 工程 page)
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  url: text('url'),
  coverImageKey: text('cover_image_key'),
  techStack: text('tech_stack').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  status: text('status', { enum: ['draft', 'published'] }).notNull().default('draft'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  projects_status_idx: index('projects_status_idx').on(table.status),
  projects_sort_order_idx: index('projects_sort_order_idx').on(table.sortOrder),
}))

export const postLikes = sqliteTable('post_likes', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  fingerprint: text('fingerprint').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  post_likes_post_id_idx: index('post_likes_post_id_idx').on(table.postId),
  post_likes_unique: uniqueIndex('post_likes_unique').on(table.postId, table.fingerprint),
}))
