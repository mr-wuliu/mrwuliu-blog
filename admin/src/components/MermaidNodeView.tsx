import { useState, useEffect, useRef, useMemo } from 'react'
import type { ReactNodeViewProps } from '@tiptap/react'
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import mermaid from 'mermaid'
import { CODE_BLOCK_LANGUAGES, normalizeCodeBlockLanguage } from './codeBlockLanguages'

let instanceCounter = 0

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

function extractNodeIds(code: string): string[] {
  const ids: Record<string, boolean> = {}
  const p1 = /\b([A-Za-z_][A-Za-z0-9_]*)\s*[\[\{(]/g
  let m: RegExpExecArray | null
  while ((m = p1.exec(code)) !== null) ids[m[1]] = true
  const p2 = /(?:-->|---)\s*(?:\|[^|]*\|\s*)?([A-Za-z_][A-Za-z0-9_]*)/g
  while ((m = p2.exec(code)) !== null) ids[m[1]] = true
  return Object.keys(ids)
}

function buildStyledCode(rawCode: string): string {
  const nodeIds = extractNodeIds(rawCode)
  const styleLines = nodeIds.map((nid, i) => {
    const c = nodePalette[i % nodePalette.length]
    return `\nstyle ${nid} fill:${c.bg},stroke:${c.border},color:${c.text},font-weight:bold`
  }).join('')

  const initDir = `%%{init:${JSON.stringify({ theme: 'base', look: 'handDrawn', themeVariables: themeVars })}}%%\n`
  return initDir + rawCode + styleLines
}

function postProcessSvg(svgEl: SVGSVGElement) {
  // Reorder: put stroke-only paths after fill paths so strokes draw on top
  svgEl.querySelectorAll('.node').forEach((node) => {
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
}

export default function MermaidNodeView({ node, updateAttributes }: ReactNodeViewProps) {
  const currentLang = normalizeCodeBlockLanguage((node.attrs.language as string) || '')
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idRef = useRef<string>(`mermaid-${++instanceCounter}`)
  const containerRef = useRef<HTMLDivElement>(null)

  const code = useMemo(() => {
    let text = ''
    node.content.forEach((child) => {
      text += child.text
    })
    return text
  }, [node])

  useEffect(() => {
    mermaid.initialize({ ...baseConfig, themeVariables: themeVars })
  }, [])

  // Post-process SVG after render
  useEffect(() => {
    if (svg && containerRef.current) {
      const svgEl = containerRef.current.querySelector('svg')
      if (svgEl) postProcessSvg(svgEl)
    }
  }, [svg])

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    if (!code.trim()) {
      setSvg(null)
      setError(null)
      return
    }

    timerRef.current = setTimeout(async () => {
      try {
        const styledCode = buildStyledCode(code)
        // Reset mermaid instance to pick up new theme
        mermaid.initialize({ ...baseConfig, themeVariables: themeVars })
        const { svg: renderedSvg } = await mermaid.render(idRef.current, styledCode)
        setSvg(renderedSvg)
        setError(null)
      } catch (err) {
        setSvg(null)
        setError(err instanceof Error ? err.message : String(err))
      }
    }, 300)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [code])

  return (
    <NodeViewWrapper className="code-block-wrapper">
      <select
        className="code-block-lang-select"
        contentEditable={false}
        value={currentLang}
        onChange={(e) => updateAttributes({ language: normalizeCodeBlockLanguage(e.target.value) || null })}
      >
        {CODE_BLOCK_LANGUAGES.map((lang) => (
          <option key={lang.value} value={lang.value}>
            {lang.label}
          </option>
        ))}
      </select>
      <pre>
        <NodeViewContent className="code-block-content" />
      </pre>
      <div className="mermaid-preview" contentEditable={false}>
        <div className="mermaid-preview-label">MERMAID</div>
        {error ? (
          <div className="mermaid-preview-error">{error}</div>
        ) : svg ? (
          <div ref={containerRef} dangerouslySetInnerHTML={{ __html: svg }} />
        ) : code.trim() ? (
          <div className="mermaid-preview-loading">Rendering...</div>
        ) : (
          <div className="mermaid-preview-empty">Enter Mermaid diagram code above</div>
        )}
      </div>
    </NodeViewWrapper>
  )
}
