export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function generateUniqueSlug(title: string): string {
  const base = slugify(title)
  const suffix = crypto.randomUUID().slice(0, 6)
  return base ? `${base}-${suffix}` : suffix
}
