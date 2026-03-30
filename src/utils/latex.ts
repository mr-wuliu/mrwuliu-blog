import katex from 'katex'

/**
 * Render LaTeX formulas in HTML content server-side using KaTeX.
 *
 * Supports:
 * - Display math: $$...$$
 * - Inline math: $...$
 *
 * LaTeX delimiters inside HTML tags or code blocks are preserved as-is.
 */
export function renderLatex(html: string): string {
  // Protect content inside <code>, <pre>, and HTML tags from LaTeX processing
  const placeholders: string[] = []
  let result = html

  // Replace <code>...</code> and <pre>...</pre> blocks with placeholders
  result = result.replace(/<(code|pre)[^>]*>[\s\S]*?<\/\1>/gi, (match) => {
    const idx = placeholders.length
    placeholders.push(match)
    return `%%PLACEHOLDER_${idx}%%`
  })

  // Replace HTML tags (opening/closing) with placeholders to avoid $ inside attributes
  result = result.replace(/<[^>]+>/g, (match) => {
    const idx = placeholders.length
    placeholders.push(match)
    return `%%PLACEHOLDER_${idx}%%`
  })

  // Render display math: $$...$$
  result = result.replace(/\$\$([\s\S]+?)\$\$/g, (_match, tex: string) => {
    return renderKatexToString(tex.trim(), true)
  })

  // Render inline math: $...$
  result = result.replace(/\$([^\$\n]+?)\$/g, (_match, tex: string) => {
    return renderKatexToString(tex.trim(), false)
  })

  // Restore placeholders
  for (let i = placeholders.length - 1; i >= 0; i--) {
    result = result.replace(`%%PLACEHOLDER_${i}%%`, placeholders[i])
  }

  return result
}

function renderKatexToString(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: false,
    })
  } catch {
    // If rendering fails, return the raw LaTeX wrapped in a code span
    const escaped = tex
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    return displayMode
      ? `<code class="latex-error">${escaped}</code>`
      : `<code class="latex-error">${escaped}</code>`
  }
}

/**
 * TOC heading extracted from rendered HTML content.
 */
export interface TocHeading {
  id: string
  level: number
  text: string
}

/**
 * Add anchor IDs to h2-h4 headings in rendered HTML and extract TOC entries.
 * Mutates the HTML string by injecting id attributes into heading tags.
 */
export function generateToc(html: string): { html: string; headings: TocHeading[] } {
  const headings: TocHeading[] = []
  let counter = 0

  const result = html.replace(/<(h[234])([^>]*)>([\s\S]*?)<\/\1>/gi, (match, tag: string, attrs: string, content: string) => {
    const level = parseInt(tag[1], 10)
    counter++
    const id = `heading-${counter}`

    // Strip HTML from content to get plain text for TOC
    const text = content.replace(/<[^>]+>/g, '').trim()

    headings.push({ id, level, text })

    // Check if attrs already contains an id
    if (/id\s*=/i.test(attrs)) {
      return match
    }

    return `<${tag} id="${id}"${attrs}>${content}</${tag}>`
  })

  return { html: result, headings }
}
