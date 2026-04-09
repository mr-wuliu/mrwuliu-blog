import mermaid from 'mermaid'

const baseConfig = {
  startOnLoad: false,
  theme: 'base' as const,
  look: 'handDrawn' as const,
  securityLevel: 'strict' as const,
}

const themeVars = {
  fontFamily: '"Nunito", sans-serif',
  fontSize: '14px',
  primaryColor: '#eef2f7',
  primaryTextColor: '#2d3748',
  primaryBorderColor: '#94a3b8',
  lineColor: '#94a3b8',
  secondaryColor: '#f1f5f9',
  tertiaryColor: '#ffffff',
  background: '#fafafa',
  mainBkg: '#eef2f7',
  nodeBorder: '#94a3b8',
  clusterBkg: '#f8fafc',
  clusterBorder: '#94a3b8',
  titleColor: '#2d3748',
  edgeLabelBackground: '#f8fafc',
  nodeTextColor: '#2d3748',
  nodeBorderRadius: '12px',
}

const nodePalette = [
  { bg: '#FF6B6B', border: '#D94848', text: '#ffffff' },
  { bg: '#FFB347', border: '#E09530', text: '#ffffff' },
  { bg: '#6BCB77', border: '#4FAF5B', text: '#ffffff' },
  { bg: '#4D96FF', border: '#3078E0', text: '#ffffff' },
  { bg: '#9B72CF', border: '#7D52B0', text: '#ffffff' },
  { bg: '#FF6EB4', border: '#D94E94', text: '#ffffff' },
  { bg: '#45D4C8', border: '#28B5A9', text: '#ffffff' },
  { bg: '#FFD93D', border: '#E0BC20', text: '#ffffff' },
]

let renderCounter = 0

function extractNodeIds(code: string): string[] {
  const ids: Record<string, boolean> = {}
  const p1 = /\b([A-Za-z_][A-Za-z0-9_]*)\s*[\[\{(]/g
  let m: RegExpExecArray | null
  while ((m = p1.exec(code)) !== null) ids[m[1]] = true
  const p2 = /(?:-->|---)\s*(?:\|[^|]*\|\s*)?([A-Za-z_][A-Za-z0-9_]*)/g
  while ((m = p2.exec(code)) !== null) ids[m[1]] = true
  return Object.keys(ids)
}

function postProcessSvg(svgHtml: string): string {
  const container = document.createElement('div')
  container.innerHTML = svgHtml
  const svg = container.querySelector('svg')
  if (!svg) return svgHtml

  const vb = svg.getAttribute('viewBox')
  if (vb && svg.getAttribute('width') === '100%') {
    const vw = vb.split(' ')[2]
    if (vw) svg.setAttribute('width', vw)
  }
  svg.removeAttribute('style')
  svg.style.maxWidth = '100%'
  svg.style.height = 'auto'

  const nodeCount = svg.querySelectorAll('.node').length
  const edgeCount = svg.querySelectorAll('.edgePath').length
  const complexity = nodeCount + edgeCount
  const sw = complexity <= 4 ? 2.8
    : complexity <= 12 ? 2.2 - (complexity - 4) * 0.075
    : Math.max(1.0, 1.6 - (complexity - 12) * 0.03)

  svg.querySelectorAll('.edgePath path').forEach((p) => {
    ;(p as SVGPathElement).style.strokeWidth = sw + 'px'
  })

  svg.querySelectorAll('.node').forEach((node) => {
    const paths = node.querySelectorAll('path')
    const fills: SVGPathElement[] = []
    const strokes: SVGPathElement[] = []
    paths.forEach((p) => {
      const hasFill = p.style.fill && p.style.fill !== 'none'
      const hasStroke = p.style.stroke && p.style.stroke !== 'none'
      if (hasStroke && !hasFill) {
        strokes.push(p)
        p.style.strokeWidth = '3px'
      } else {
        fills.push(p)
      }
    })
    fills.forEach((f) => node.appendChild(f))
    strokes.forEach((s) => node.appendChild(s))
  })

  return container.innerHTML
}

async function renderMermaidBlock(code: string): Promise<string | null> {
  try {
    mermaid.initialize({ ...baseConfig, themeVariables: themeVars })

    const nodeIds = extractNodeIds(code)
    const styleLines = nodeIds.map((nid, i) => {
      const c = nodePalette[i % nodePalette.length]
      return `\nstyle ${nid} fill:${c.bg},stroke:${c.border},color:${c.text},font-weight:bold`
    }).join('')

    const initDir = `%%{init:${JSON.stringify({ theme: 'base', look: 'handDrawn', themeVariables: themeVars })}}%%\n`
    const styledCode = initDir + code + styleLines

    const id = `mermaid-prerender-${++renderCounter}-${Date.now()}`
    const { svg } = await mermaid.render(id, styledCode)

    return postProcessSvg(svg)
  } catch {
    return null
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
    .replace(/&#x2F;/g, '/')
}

export async function preRenderMermaidInHtml(html: string): Promise<string> {
  const mermaidBlockRegex = /<pre><code(?:\s+class="language-mermaid")?>([\s\S]*?)<\/code><\/pre>/g

  const matches: { fullMatch: string; code: string; index: number }[] = []
  let m: RegExpExecArray | null
  while ((m = mermaidBlockRegex.exec(html)) !== null) {
    matches.push({ fullMatch: m[0], code: decodeHtmlEntities(m[1]).trim(), index: m.index })
  }

  if (matches.length === 0) return html

  const replacements: { fullMatch: string; replacement: string }[] = []

  for (const match of matches) {
    if (!match.code) continue
    const svg = await renderMermaidBlock(match.code)
    if (svg) {
      const encodedCode = match.code.replace(/"/g, '&quot;')
      replacements.push({
        fullMatch: match.fullMatch,
        replacement: `<div class="mermaid-pre-rendered" data-mermaid-code="${encodedCode}"><div class="mermaid-diagram">${svg}</div></div>`,
      })
    }
  }

  let result = html
  for (const { fullMatch, replacement } of replacements) {
    result = result.replace(fullMatch, replacement)
  }
  return result
}
