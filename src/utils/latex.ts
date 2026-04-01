import katex from 'katex'

function renderKatexToString(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: false,
    })
  } catch {
    const escaped = tex
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    return `<code class="latex-error">${escaped}</code>`
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
}

export function renderLatex(html: string): string {
  let result = html

  // Handle tiptap block math nodes: <div data-latex="..." data-type="block-math"></div>
  // Attribute order varies — match each independently
  result = result.replace(
    /<div([^>]*)data-type="block-math"([^>]*)><\/div>/g,
    (fullMatch) => {
      const latexMatch = fullMatch.match(/data-latex="([^"]*)"/)
      if (!latexMatch) return fullMatch
      return renderKatexToString(decodeHtmlEntities(latexMatch[1]).trim(), true)
    },
  )

  // Handle tiptap inline math nodes: <span data-latex="..." data-type="inline-math"></span>
  result = result.replace(
    /<span([^>]*)data-type="inline-math"([^>]*)><\/span>/g,
    (fullMatch) => {
      const latexMatch = fullMatch.match(/data-latex="([^"]*)"/)
      if (!latexMatch) return fullMatch
      return renderKatexToString(decodeHtmlEntities(latexMatch[1]).trim(), false)
    },
  )

  // Fallback: render raw $$...$$ and $...$ delimiters for legacy content
  const placeholders: string[] = []

  // Protect content inside <code>, <pre> blocks from LaTeX processing
  result = result.replace(/<(code|pre)[^>]*>[\s\S]*?<\/\1>/gi, (match) => {
    const idx = placeholders.length
    placeholders.push(match)
    return `%%PLACEHOLDER_${idx}%%`
  })

  // Protect HTML tags to avoid $ inside attributes
  result = result.replace(/<[^>]+>/g, (match) => {
    const idx = placeholders.length
    placeholders.push(match)
    return `%%PLACEHOLDER_${idx}%%`
  })

  result = result.replace(/\$\$([\s\S]+?)\$\$/g, (_match, tex: string) => {
    return renderKatexToString(tex.trim(), true)
  })

  result = result.replace(/\$([^\$\n]+?)\$/g, (_match, tex: string) => {
    return renderKatexToString(tex.trim(), false)
  })

  for (let i = placeholders.length - 1; i >= 0; i--) {
    result = result.replace(`%%PLACEHOLDER_${i}%%`, placeholders[i])
  }

  return result
}

export interface TocHeading {
  id: string
  level: number
  text: string
}

export function generateToc(html: string): { html: string; headings: TocHeading[] } {
  const headings: TocHeading[] = []
  let counter = 0

  const result = html.replace(/<(h[234])([^>]*)>([\s\S]*?)<\/\1>/gi, (match, tag: string, attrs: string, content: string) => {
    const level = parseInt(tag[1], 10)
    counter++
    const id = `heading-${counter}`

    const text = content.replace(/<[^>]+>/g, '').trim()

    headings.push({ id, level, text })

    if (/id\s*=/i.test(attrs)) {
      return match
    }

    return `<${tag} id="${id}"${attrs}>${content}</${tag}>`
  })

  return { html: result, headings }
}
