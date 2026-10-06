export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

export function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}

export function safeNextPath(value: string | undefined, fallback = '/'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\x00-\x20]/.test(value)) return fallback
  const url = new URL(value, 'https://mrwuliu.top')
  return url.origin === 'https://mrwuliu.top' ? url.pathname + url.search + url.hash : fallback
}

// Comments are stored escaped for compatibility with existing API consumers.
// Decode exactly once before JSX escapes the text for its output context.
export function commentText(value: string): string {
  const entities: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#039;': "'", '&#39;': "'" }
  return value.replace(/&(?:amp|lt|gt|quot);|&#0?39;/g, entity => entities[entity] ?? entity)
}
