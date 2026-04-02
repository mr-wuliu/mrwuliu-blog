export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function generateUniqueSlug(_title: string): string {
  return crypto.randomUUID().slice(0, 8)
}
